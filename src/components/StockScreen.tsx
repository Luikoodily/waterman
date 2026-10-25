"use client"

import { useEffect, useState } from "react"
import { useShop } from "@/components/shop-context"
import { wholeNumber } from "@/lib/format"
import type { Product } from "@/lib/ledger"

export function StockScreen() {
  const shop = useShop()
  return (
    <>
      <h1>Stock</h1>
      <p className="hint">Add a case, or set the exact count if the shelf does not match.</p>
      <div className="stack">
        {shop.state.products.map((product) => (
          <StockCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}

function StockCard({ product }: { product: Product }) {
  const shop = useShop()
  const [add, setAdd] = useState("12")
  const [count, setCount] = useState(String(product.stock))

  useEffect(() => {
    setCount(String(product.stock))
  }, [product.stock])

  function addCustom() {
    const qty = wholeNumber(add)
    if (qty == null || qty < 1) {
      shop.fail("Add a whole number of stock.")
      return
    }
    shop.restock(product.id, qty)
  }

  function setExact() {
    const next = wholeNumber(count)
    if (next == null) {
      shop.fail("Count must be a whole number, 0 or more.")
      return
    }
    shop.countStock(product.id, next)
  }

  return (
    <article className="card">
      <div className="split">
        <h2 style={{ margin: 0 }}>{product.name}</h2>
        {!product.active && <span className="hidden-pill">Hidden</span>}
      </div>
      <p className="big" style={{ marginTop: 8 }}>
        {product.stock}
      </p>
      <p className="kicker">{product.unit} in stock</p>
      <div className="chips">
        {[6, 12, 24].map((qty) => (
          <button key={qty} type="button" className="chip" onClick={() => shop.restock(product.id, qty)}>
            +{qty}
          </button>
        ))}
      </div>
      <label>
        Custom add
        <input
          className="field"
          inputMode="numeric"
          autoComplete="off"
          value={add}
          onChange={(event) => setAdd(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="btn btn-sell" onClick={addCustom}>
          Add stock
        </button>
      </div>
      <label>
        Exact count
        <input
          className="field"
          inputMode="numeric"
          autoComplete="off"
          value={count}
          onChange={(event) => setCount(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={setExact}>
          Set count
        </button>
      </div>
    </article>
  )
}
