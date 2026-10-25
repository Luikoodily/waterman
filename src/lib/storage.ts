import { initialState, type State } from "@/lib/ledger"
import { parsePersisted, serialize, type Persisted } from "@/lib/persist"

const DB_NAME = "waterstock"
const STORE = "kv"
const RECORD = "state"
const STORAGE_KEY = "waterstock.v1"
const CORRUPT_KEY = "waterstock.corrupt"

export type Loaded = { state: State; warning: string | null }

let queue: Promise<void> = Promise.resolve()

export function saveState(state: State): Promise<void> {
  const payload = serialize(state)
  const run = queue.then(() => write(payload))
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function loadState(): Promise<Loaded> {
  try {
    if (typeof indexedDB !== "undefined") {
      const value = await idbGet()
      if (value != null) return accept(value)
    }
  } catch {
    // Private mode can block IndexedDB. Fall through to localStorage.
  }
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        return accept(JSON.parse(raw))
      } catch {
        return accept(raw)
      }
    }
  }
  return { state: initialState(), warning: null }
}

export function publishShop(state: State) {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel("waterstock")
  channel.postMessage({ type: "waterstock", payload: serialize(state) })
  channel.close()
}

export function subscribeShop(onState: (state: State) => void) {
  if (typeof BroadcastChannel === "undefined") return () => undefined
  const channel = new BroadcastChannel("waterstock")
  channel.onmessage = (event: MessageEvent) => {
    try {
      if (event.data?.type === "waterstock") onState(parsePersisted(event.data.payload))
    } catch {
      // Ignore a bad message from another tab.
    }
  }
  return () => channel.close()
}

function accept(value: unknown): Loaded {
  try {
    return { state: parsePersisted(value), warning: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saved shop could not be read."
    if (message.includes("newer")) throw error
    try {
      localStorage.setItem(CORRUPT_KEY, JSON.stringify(value))
    } catch {
      // Keep going. The shop can still start fresh.
    }
    return {
      state: initialState(),
      warning: "Saved shop could not be read. A copy is in waterstock.corrupt. Started fresh.",
    }
  }
}

async function write(payload: Persisted) {
  let saved = false
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      saved = true
    } catch {
      // Quota full. IndexedDB may still take it.
    }
  }
  if (typeof indexedDB !== "undefined") {
    try {
      await idbPut(payload)
      saved = true
    } catch {
      // IndexedDB blocked.
    }
  }
  if (!saved) throw new Error("Could not save")
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open shop data"))
  })
}

async function idbGet() {
  const db = await openDb()
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const request = tx.objectStore(STORE).get(RECORD)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function idbPut(payload: Persisted) {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(payload, RECORD)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error("Save aborted"))
    })
  } finally {
    db.close()
  }
}
