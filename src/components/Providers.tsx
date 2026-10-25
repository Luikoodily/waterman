"use client"

import { useEffect, useRef, useState } from "react"
import { Shell } from "@/components/Shell"
import { ShopContext, type ShopApi } from "@/components/shop-context"
import {
  addProduct as ledgerAddProduct,
  collect as ledgerCollect,
  countStock as ledgerCountStock,
  initialState,
  restock as ledgerRestock,
  sell as ledgerSell,
  setActive as ledgerSetActive,
  undo as ledgerUndo,
  updateProduct as ledgerUpdateProduct,
  type Result,
  type State,
} from "@/lib/ledger"
import { loadState, publishShop, saveState, subscribeShop } from "@/lib/storage"

export function Providers({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const stateRef = useRef(state)
  const skipSave = useRef(false)
  const locked = useRef(false)

  useEffect(() => {
    let gone = false
    loadState()
      .then((loaded) => {
        if (gone) return
        stateRef.current = loaded.state
        setState(loaded.state)
        setError(loaded.warning)
        setReady(true)
      })
      .catch((caught: unknown) => {
        if (gone) return
        locked.current = true
        setError(caught instanceof Error ? caught.message : "Could not open the saved shop.")
        setReady(true)
      })
    return () => {
      gone = true
    }
  }, [])

  useEffect(() => {
    if (!ready || locked.current) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    let cancel = false
    saveState(state)
      .then(() => {
        if (!cancel) publishShop(state)
      })
      .catch(() => {
        if (!cancel) setError("Could not save on this phone.")
      })
    return () => {
      cancel = true
    }
  }, [state, ready])

  useEffect(() => {
    return subscribeShop((next) => {
      skipSave.current = true
      stateRef.current = next
      setState(next)
    })
  }, [])

  function commit(recipe: (current: State) => Result) {
    if (locked.current) {
      setError("Saved data is locked.")
      setMessage(null)
      return false
    }
    const result = recipe(stateRef.current)
    if (!result.ok) {
      setError(result.error)
      setMessage(null)
      return false
    }
    stateRef.current = result.state
    setState(result.state)
    setError(null)
    setMessage(result.message)
    try {
      navigator.vibrate?.(12)
    } catch {
      // Vibration is optional.
    }
    return true
  }

  const api: ShopApi = {
    state,
    error,
    message,
    dismiss() {
      setError(null)
      setMessage(null)
    },
    fail(text) {
      setError(text)
      setMessage(null)
    },
    sell(input) {
      return commit((current) => ledgerSell(current, input))
    },
    restock(productId, qty) {
      return commit((current) => ledgerRestock(current, { productId, qty }))
    },
    countStock(productId, nextStock) {
      return commit((current) => ledgerCountStock(current, productId, nextStock))
    },
    collect(entryId) {
      return commit((current) => ledgerCollect(current, entryId))
    },
    addProduct(input) {
      return commit((current) => ledgerAddProduct(current, input))
    },
    updateProduct(id, patch) {
      return commit((current) => ledgerUpdateProduct(current, id, patch))
    },
    setActive(id, active) {
      return commit((current) => ledgerSetActive(current, id, active))
    },
    undo() {
      return commit((current) => ledgerUndo(current))
    },
    replaceAll(next, note) {
      locked.current = false
      skipSave.current = false
      stateRef.current = next
      setState(next)
      setError(null)
      setMessage(note)
    },
  }

  if (!ready) {
    return (
      <div className="boot">
        <p className="boot-kicker">Water Stock</p>
        <p>Opening shop…</p>
      </div>
    )
  }

  return (
    <ShopContext.Provider value={api}>
      <Shell>{children}</Shell>
    </ShopContext.Provider>
  )
}
