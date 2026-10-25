"use client"

import { createContext, useContext } from "react"
import type { AddProductInput, SellInput, State } from "@/lib/ledger"

export type ShopApi = {
  state: State
  error: string | null
  message: string | null
  dismiss: () => void
  fail: (message: string) => void
  sell: (input: SellInput) => boolean
  restock: (productId: string, qty: number) => boolean
  countStock: (productId: string, nextStock: number) => boolean
  collect: (entryId: string) => boolean
  addProduct: (input: AddProductInput) => boolean
  updateProduct: (id: string, patch: { name: string; unit: string; price: number }) => boolean
  setActive: (id: string, active: boolean) => boolean
  undo: () => boolean
  replaceAll: (state: State, message: string) => void
}

export const ShopContext = createContext<ShopApi | null>(null)

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error("Shop is not ready")
  return value
}
