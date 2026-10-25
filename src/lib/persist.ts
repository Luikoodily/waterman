import { roundMoney } from "./format"
import type { Entry, EntryType, LastAction, Product, State } from "./ledger"

export type Persisted = {
  version: 1
  products: Product[]
  entries: Entry[]
  lastAction: LastAction
}

const TYPES: EntryType[] = ["paid", "free", "unpaid", "restock", "adjust"]

export function serialize(state: State): Persisted {
  return {
    version: 1,
    products: state.products,
    entries: state.entries,
    lastAction: state.lastAction,
  }
}

export function parsePersisted(data: unknown): State {
  if (!data || typeof data !== "object") throw new Error("Backup could not be read.")
  const raw = data as { version?: unknown; products?: unknown; entries?: unknown; lastAction?: unknown }
  if (raw.version != null && raw.version !== 1) throw new Error("This backup is from a newer app.")
  if (!Array.isArray(raw.products) || raw.products.length === 0) throw new Error("Shop has no products.")
  const products = raw.products.map(parseProduct)
  const productIds = new Set<string>()
  for (const product of products) {
    if (productIds.has(product.id)) throw new Error("Duplicate product.")
    productIds.add(product.id)
  }
  if (!Array.isArray(raw.entries)) throw new Error("Backup could not be read.")
  const entries = raw.entries.map(parseEntry)
  const entryIds = new Set<string>()
  for (const entry of entries) {
    if (entryIds.has(entry.id)) throw new Error("Duplicate sale.")
    entryIds.add(entry.id)
  }
  let lastAction = parseLast(raw.lastAction)
  if (lastAction && !entryIds.has(lastAction.id)) lastAction = null
  return { products, entries, lastAction }
}

function parseProduct(value: unknown): Product {
  if (!value || typeof value !== "object") throw new Error("Bad product.")
  const raw = value as Partial<Product>
  if (typeof raw.id !== "string" || raw.id.length === 0) throw new Error("Bad product.")
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) throw new Error("Bad product.")
  if (typeof raw.unit !== "string" || raw.unit.trim().length === 0) throw new Error("Bad product.")
  if (typeof raw.price !== "number" || !Number.isFinite(raw.price) || raw.price < 0) throw new Error("Bad price.")
  if (!Number.isInteger(raw.stock) || (raw.stock ?? -1) < 0) throw new Error("Bad stock.")
  const active = raw.active === undefined ? true : raw.active
  if (typeof active !== "boolean") throw new Error("Bad product.")
  return {
    id: raw.id,
    name: raw.name.trim(),
    unit: raw.unit.trim(),
    price: roundMoney(raw.price),
    stock: raw.stock as number,
    active,
  }
}

function parseEntry(value: unknown): Entry {
  if (!value || typeof value !== "object") throw new Error("Bad sale.")
  const raw = value as Partial<Entry>
  if (typeof raw.id !== "string" || typeof raw.productId !== "string") throw new Error("Bad sale.")
  if (typeof raw.at !== "string" || !isDay(raw.day)) throw new Error("Bad sale.")
  if (typeof raw.productName !== "string" || typeof raw.unit !== "string") throw new Error("Bad sale.")
  if (!raw.type || !TYPES.includes(raw.type)) throw new Error("Bad sale.")
  if (typeof raw.qty !== "number" || !Number.isInteger(raw.qty)) throw new Error("Bad quantity.")
  if (raw.type === "adjust") {
    if (raw.qty === 0) throw new Error("Bad stock fix.")
  } else if (raw.qty < 1) throw new Error("Bad quantity.")
  if (typeof raw.unitPrice !== "number" || raw.unitPrice < 0) throw new Error("Bad price.")
  if (typeof raw.amount !== "number" || raw.amount < 0) throw new Error("Bad amount.")
  if (typeof raw.note !== "string") throw new Error("Bad sale.")
  const entry: Entry = {
    id: raw.id,
    at: raw.at,
    day: raw.day as string,
    productId: raw.productId,
    productName: raw.productName,
    unit: raw.unit,
    qty: raw.qty,
    unitPrice: roundMoney(raw.unitPrice),
    amount: roundMoney(raw.amount),
    type: raw.type,
    note: raw.note,
  }
  const hasAt = typeof raw.collectedAt === "string"
  const hasDay = isDay(raw.collectedDay)
  if (raw.type === "unpaid") {
    if (hasAt !== hasDay) throw new Error("Bad due sale.")
    if (hasAt && hasDay) {
      entry.collectedAt = raw.collectedAt
      entry.collectedDay = raw.collectedDay
    }
  } else if (raw.collectedAt != null || raw.collectedDay != null) {
    throw new Error("Bad sale.")
  }
  return entry
}

function parseLast(value: unknown): LastAction {
  if (value == null) return null
  if (!value || typeof value !== "object") throw new Error("Bad last action.")
  const raw = value as { kind?: string; id?: string }
  if ((raw.kind === "add-entry" || raw.kind === "collect") && typeof raw.id === "string") {
    return { kind: raw.kind, id: raw.id }
  }
  throw new Error("Bad last action.")
}

function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}
