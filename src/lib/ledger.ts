import { inr, roundMoney } from "./format"

/**
 * Static shop ledger. No server.
 *
 * Stock drops when a unit leaves: paid, free, or not paid.
 * Cash is paid sales plus not-paid sales later marked collected.
 * Free and not-paid store a person name. Free cash is 0.
 * End-of-day stock is current stock with later movements reversed.
 * Every product shares this ledger.
 */

export const WATER_ID = "water-bottle"

export type Product = {
  id: string
  name: string
  unit: string
  price: number
  stock: number
  active: boolean
}

export type EntryType = "paid" | "free" | "unpaid" | "restock" | "adjust"

export type Entry = {
  id: string
  at: string
  day: string
  productId: string
  productName: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  type: EntryType
  note: string
  collectedAt?: string
  collectedDay?: string
}

export type LastAction = { kind: "add-entry"; id: string } | { kind: "collect"; id: string } | null

export type State = {
  products: Product[]
  entries: Entry[]
  lastAction: LastAction
}

export type Clock = {
  now?: () => Date
  id?: () => string
}

export type Result = { ok: true; state: State; message: string } | { ok: false; error: string }

export type SellInput = {
  productId: string
  qty: number
  type: "paid" | "free" | "unpaid"
  note?: string
}

export type AddProductInput = {
  name: string
  unit: string
  price: number
  stock: number
}

export type ProductDay = {
  productId: string
  name: string
  unit: string
  stockEnd: number
  outQty: number
  paidQty: number
  freeQty: number
  unpaidQty: number
  cash: number
  freeWorth: number
  restockQty: number
}

export type DaySummary = {
  day: string
  outQty: number
  paidQty: number
  freeQty: number
  unpaidQty: number
  cash: number
  freeWorth: number
  dueOpened: number
  dueStillOpen: number
  openDueAmount: number
  restockQty: number
  byProduct: ProductDay[]
  lines: Entry[]
  openDues: Entry[]
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function shiftDay(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number)
  const date = new Date(y, (m ?? 1) - 1, d)
  date.setDate(date.getDate() + delta)
  return dayKey(date)
}

export function initialState(): State {
  return {
    products: [
      {
        id: WATER_ID,
        name: "Water Bottle",
        unit: "bottle",
        price: 20,
        stock: 0,
        active: true,
      },
    ],
    entries: [],
    lastAction: null,
  }
}

export function sell(state: State, input: SellInput, clock?: Clock): Result {
  const qtyError = positiveInt(input.qty, 10000)
  if (qtyError) return err(qtyError)
  const product = productOf(state, input.productId)
  if (!product) return err("Product not found.")
  if (!product.active) return err("That product is hidden.")
  if (input.qty > product.stock) return err(`Only ${product.stock} ${product.unit} in stock.`)
  const note = (input.note ?? "").trim()
  if (note.length > 60) return err("Name is too long.")
  if ((input.type === "free" || input.type === "unpaid") && note.length === 0) {
    return err("Add a name for free or not paid.")
  }
  const amount = input.type === "free" ? 0 : roundMoney(product.price * input.qty)
  const entry = entryFor(product, clock, {
    qty: input.qty,
    unitPrice: product.price,
    amount,
    type: input.type,
    note,
  })
  const next = withEntry(
    state,
    entry,
    state.products.map((item) =>
      item.id === product.id ? { ...item, stock: item.stock - input.qty } : item,
    ),
  )
  const message =
    input.type === "paid"
      ? `Sold ${input.qty} ${product.name} · ${inr(amount)}`
      : input.type === "free"
        ? `Free ${input.qty} ${product.name} · ${note}`
        : `Not paid ${input.qty} ${product.name} · ${inr(amount)} · ${note}`
  return ok(next, message)
}

export function restock(
  state: State,
  input: { productId: string; qty: number; note?: string },
  clock?: Clock,
): Result {
  const qtyError = positiveInt(input.qty, 10000)
  if (qtyError) return err(qtyError)
  const product = productOf(state, input.productId)
  if (!product) return err("Product not found.")
  const note = (input.note ?? "").trim()
  const entry = entryFor(product, clock, {
    qty: input.qty,
    unitPrice: product.price,
    amount: 0,
    type: "restock",
    note,
  })
  const next = withEntry(
    state,
    entry,
    state.products.map((item) =>
      item.id === product.id ? { ...item, stock: item.stock + input.qty } : item,
    ),
  )
  return ok(next, `Added ${input.qty} ${product.name}.`)
}

export function countStock(state: State, productId: string, nextStock: number, clock?: Clock): Result {
  if (!Number.isInteger(nextStock) || nextStock < 0 || nextStock > 1_000_000) {
    return err("Stock must be a whole number from 0 to 1000000.")
  }
  const product = productOf(state, productId)
  if (!product) return err("Product not found.")
  const delta = nextStock - product.stock
  if (delta === 0) return ok(state, `${product.name} stock already ${product.stock}.`)
  const entry = entryFor(product, clock, {
    qty: delta,
    unitPrice: product.price,
    amount: 0,
    type: "adjust",
    note: "Stock count",
  })
  const next = withEntry(
    state,
    entry,
    state.products.map((item) => (item.id === product.id ? { ...item, stock: nextStock } : item)),
  )
  return ok(next, `${product.name} stock set to ${nextStock}.`)
}

export function collect(state: State, entryId: string, clock?: Clock): Result {
  const entry = state.entries.find((item) => item.id === entryId)
  if (!entry || entry.type !== "unpaid" || entry.collectedAt) return err("That due sale is not open.")
  const time = nowParts(clock)
  const entries = state.entries.map((item) =>
    item.id === entryId ? { ...item, collectedAt: time.at, collectedDay: time.day } : item,
  )
  return ok(
    { ...state, entries, lastAction: { kind: "collect", id: entryId } },
    `Cash in · ${inr(entry.amount)} · ${entry.note || entry.productName}`,
  )
}

export function addProduct(state: State, input: AddProductInput, clock?: Clock): Result {
  const name = input.name.trim()
  const unit = input.unit.trim()
  if (name.length < 1 || name.length > 40) return err("Name must be 1 to 40 characters.")
  if (unit.length < 1 || unit.length > 20) return err("Unit must be 1 to 20 characters.")
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1_000_000) {
    return err("Price must be 0 or more.")
  }
  if (!Number.isInteger(input.stock) || input.stock < 0 || input.stock > 1_000_000) {
    return err("Starting stock must be a whole number, 0 or more.")
  }
  const product: Product = {
    id: nextId(clock),
    name,
    unit,
    price: roundMoney(input.price),
    stock: 0,
    active: true,
  }
  const withProduct: State = { ...state, products: [...state.products, product], lastAction: null }
  if (input.stock === 0) return ok(withProduct, `Added ${name}.`)
  return restock(withProduct, { productId: product.id, qty: input.stock, note: "Opening stock" }, clock)
}

export function updateProduct(
  state: State,
  id: string,
  patch: { name: string; unit: string; price: number },
): Result {
  const product = productOf(state, id)
  if (!product) return err("Product not found.")
  const name = patch.name.trim()
  const unit = patch.unit.trim()
  if (name.length < 1 || name.length > 40) return err("Name must be 1 to 40 characters.")
  if (unit.length < 1 || unit.length > 20) return err("Unit must be 1 to 20 characters.")
  if (!Number.isFinite(patch.price) || patch.price < 0 || patch.price > 1_000_000) {
    return err("Price must be 0 or more.")
  }
  const products = state.products.map((item) =>
    item.id === id ? { ...item, name, unit, price: roundMoney(patch.price) } : item,
  )
  return ok({ ...state, products, lastAction: null }, `Saved ${name}.`)
}

export function setActive(state: State, id: string, active: boolean): Result {
  const product = productOf(state, id)
  if (!product) return err("Product not found.")
  if (!active) {
    if (product.stock !== 0) return err("Stock must be 0 before hiding.")
    const open = state.entries.some(
      (entry) => entry.productId === id && entry.type === "unpaid" && !entry.collectedAt,
    )
    if (open) return err("Collect the money before hiding.")
  }
  if (product.active === active) {
    return ok(state, active ? `${product.name} is already on Sell.` : `${product.name} is already hidden.`)
  }
  const products = state.products.map((item) => (item.id === id ? { ...item, active } : item))
  return ok(
    { ...state, products, lastAction: null },
    active ? `${product.name} is back on Sell.` : `Hidden ${product.name}.`,
  )
}

export function undo(state: State): Result {
  const action = state.lastAction
  if (!action) return err("Nothing to undo.")
  if (action.kind === "collect") {
    const entries = state.entries.map((entry) => {
      if (entry.id !== action.id) return entry
      const next = { ...entry }
      delete next.collectedAt
      delete next.collectedDay
      return next
    })
    return ok({ ...state, entries, lastAction: null }, "Undone.")
  }
  const entry = state.entries.find((item) => item.id === action.id)
  if (!entry) return err("Nothing to undo.")
  if (!state.products.some((product) => product.id === entry.productId)) {
    return err("Cannot undo. Product was removed.")
  }
  const products = state.products.map((product) => {
    if (product.id !== entry.productId) return product
    if (entry.type === "restock" || entry.type === "adjust") {
      return { ...product, stock: product.stock - entry.qty }
    }
    return { ...product, stock: product.stock + entry.qty }
  })
  if (products.some((product) => product.stock < 0)) {
    return err("Cannot undo. Stock would go below zero.")
  }
  return ok(
    { products, entries: state.entries.filter((item) => item.id !== entry.id), lastAction: null },
    "Undone.",
  )
}

export function stockAtEnd(state: State, productId: string, day: string) {
  const product = productOf(state, productId)
  if (!product) return 0
  let stock = product.stock
  for (const entry of state.entries) {
    if (entry.productId !== productId || entry.day <= day) continue
    if (entry.type === "paid" || entry.type === "free" || entry.type === "unpaid") stock += entry.qty
    else stock -= entry.qty
  }
  return stock
}

export function summarize(state: State, day: string): DaySummary {
  const dayEntries = state.entries.filter((entry) => entry.day === day)
  const movement = dayEntries.filter(
    (entry) => entry.type === "paid" || entry.type === "free" || entry.type === "unpaid",
  )
  const outQty = sumQty(movement)
  const paidQty = sumQty(movement.filter((entry) => entry.type === "paid"))
  const freeQty = sumQty(movement.filter((entry) => entry.type === "free"))
  const unpaidQty = sumQty(movement.filter((entry) => entry.type === "unpaid"))
  const cash = roundMoney(state.entries.reduce((sum, entry) => sum + cashOnDay(entry, day), 0))
  const freeWorth = roundMoney(
    movement.filter((entry) => entry.type === "free").reduce((sum, entry) => sum + entry.unitPrice * entry.qty, 0),
  )
  const dueOpened = roundMoney(
    movement.filter((entry) => entry.type === "unpaid").reduce((sum, entry) => sum + entry.amount, 0),
  )
  const openDues = state.entries
    .filter((entry) => entry.type === "unpaid" && !entry.collectedAt)
    .slice()
    .sort((a, b) => (a.at < b.at ? -1 : 1))
  const openDueAmount = roundMoney(openDues.reduce((sum, entry) => sum + entry.amount, 0))
  const dueStillOpen = roundMoney(
    openDues.filter((entry) => entry.day === day).reduce((sum, entry) => sum + entry.amount, 0),
  )
  const restockQty = sumQty(dayEntries.filter((entry) => entry.type === "restock"))
  const ids = new Set(state.products.map((product) => product.id))
  for (const entry of state.entries) {
    if (entry.day === day || entry.collectedDay === day) ids.add(entry.productId)
  }
  const byProduct = [...ids]
    .map((productId) => {
      const product = state.products.find((item) => item.id === productId)
      const named = state.entries.find((entry) => entry.productId === productId)
      const today = state.entries.filter((entry) => entry.productId === productId && entry.day === day)
      const out = today.filter(
        (entry) => entry.type === "paid" || entry.type === "free" || entry.type === "unpaid",
      )
      return {
        productId,
        name: product?.name ?? named?.productName ?? "Item",
        unit: product?.unit ?? named?.unit ?? "unit",
        stockEnd: stockAtEnd(state, productId, day),
        outQty: sumQty(out),
        paidQty: sumQty(out.filter((entry) => entry.type === "paid")),
        freeQty: sumQty(out.filter((entry) => entry.type === "free")),
        unpaidQty: sumQty(out.filter((entry) => entry.type === "unpaid")),
        cash: roundMoney(
          state.entries
            .filter((entry) => entry.productId === productId)
            .reduce((sum, entry) => sum + cashOnDay(entry, day), 0),
        ),
        freeWorth: roundMoney(
          out.filter((entry) => entry.type === "free").reduce((sum, entry) => sum + entry.unitPrice * entry.qty, 0),
        ),
        restockQty: sumQty(today.filter((entry) => entry.type === "restock")),
      }
    })
    .sort(sortProducts)
  const lines = dayEntries.slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  return {
    day,
    outQty,
    paidQty,
    freeQty,
    unpaidQty,
    cash,
    freeWorth,
    dueOpened,
    dueStillOpen,
    openDueAmount,
    restockQty,
    byProduct,
    lines,
    openDues,
  }
}

function cashOnDay(entry: Entry, day: string) {
  if (entry.type === "paid" && entry.day === day) return entry.amount
  if (entry.type === "unpaid" && entry.collectedDay === day) return entry.amount
  return 0
}

function sumQty(entries: Entry[]) {
  return entries.reduce((sum, entry) => sum + entry.qty, 0)
}

function sortProducts(a: { productId: string; name: string }, b: { productId: string; name: string }) {
  if (a.productId === WATER_ID) return -1
  if (b.productId === WATER_ID) return 1
  return a.name.localeCompare(b.name)
}

function entryFor(
  product: Product,
  clock: Clock | undefined,
  fields: Pick<Entry, "qty" | "unitPrice" | "amount" | "type" | "note">,
): Entry {
  const time = nowParts(clock)
  return {
    id: nextId(clock),
    ...time,
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    ...fields,
  }
}

function withEntry(state: State, entry: Entry, products: Product[]): State {
  return {
    products,
    entries: [...state.entries, entry],
    lastAction: { kind: "add-entry", id: entry.id },
  }
}

function productOf(state: State, id: string) {
  return state.products.find((product) => product.id === id) ?? null
}

function positiveInt(n: number, max: number) {
  if (!Number.isInteger(n) || n < 1 || n > max) return `Use a whole number from 1 to ${max}.`
  return null
}

function nowParts(clock?: Clock) {
  const now = clock?.now ? clock.now() : new Date()
  return { at: now.toISOString(), day: dayKey(now) }
}

function nextId(clock?: Clock) {
  return clock?.id ? clock.id() : crypto.randomUUID()
}

function ok(state: State, message: string): Result {
  return { ok: true, state, message }
}

function err(error: string): Result {
  return { ok: false, error }
}
