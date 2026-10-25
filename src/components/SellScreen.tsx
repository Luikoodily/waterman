"use client"

import Link from "next/link"
import { useState } from "react"
import { useShop } from "@/components/shop-context"
import { inr, roundMoney } from "@/lib/format"
import { dayKey, summarize } from "@/lib/ledger"

export function SellScreen() {
  const shop = useShop()
  const today = summarize(shop.state, dayKey())
  const products = shop.state.products.filter((product) => product.active)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  return (
    <>
      <h1>Sell</h1>
      <div className="tiles">
        <div className="tile">
          <span>Sold today</span>
          <strong>{today.outQty}</strong>
        </div>
        <div className="tile">
          <span>Cash today</span>
          <strong>{inr(today.cash)}</strong>
        </div>
        <div className="tile">
          <span>Free today</span>
          <strong>{today.freeQty}</strong>
        </div>
        <div className="tile">
          <span>Still not paid</span>
          <strong>{inr(today.openDueAmount)}</strong>
        </div>
      </div>
      <p className="hint">
        <Link className="linkish" href="/dashboard">
          Open day sheet
        </Link>
      </p>
      {shop.state.entries.length === 0 && (
        <p className="hint">Check the price on Products, then add stock. Water Bottle starts at {inr(20)}.</p>
      )}
      <div className="stack">
        {products.length === 0 && <p className="hint">No products on sale. Add one in Products.</p>}
        {products.map((product) => {
          const chosen = qty[product.id] ?? 1
          const count = product.stock === 0 ? 0 : Math.min(Math.max(chosen, 1), product.stock)
          const total = roundMoney(product.price * count)
          const note = notes[product.id] ?? ""
          function go(type: "paid" | "free" | "unpaid") {
            const ok = shop.sell({ productId: product.id, qty: count, type, note })
            if (ok) setNotes((current) => ({ ...current, [product.id]: "" }))
          }
          return (
            <article className="card" key={product.id}>
              <div className="split">
                <h2 style={{ margin: 0 }}>{product.name}</h2>
                <p className="price">{inr(product.price)}</p>
              </div>
              <p className={product.stock === 0 ? "out" : product.stock <= 5 ? "low" : "kicker"}>
                {product.stock} {product.unit} left
                {product.stock === 0 && (
                  <>
                    {" "}
                    · <Link className="linkish" href="/stock">Add stock</Link>
                  </>
                )}
              </p>
              <div className="stepper">
                <button
                  type="button"
                  aria-label={`Fewer ${product.name}`}
                  disabled={count <= 1}
                  onClick={() => setQty((current) => ({ ...current, [product.id]: Math.max(1, count - 1) }))}
                >
                  −
                </button>
                <strong>{count}</strong>
                <button
                  type="button"
                  aria-label={`More ${product.name}`}
                  disabled={count >= product.stock}
                  onClick={() =>
                    setQty((current) => ({ ...current, [product.id]: Math.min(product.stock, count + 1) }))
                  }
                >
                  +
                </button>
              </div>
              <label>
                Name
                <input
                  className="field"
                  maxLength={60}
                  autoComplete="off"
                  placeholder="Required for free or not paid"
                  value={note}
                  onChange={(event) => setNotes((current) => ({ ...current, [product.id]: event.target.value }))}
                />
              </label>
              <div className="actions">
                <button type="button" className="btn btn-sell" disabled={count < 1} onClick={() => go("paid")}>
                  {count < 1 ? "Out of stock" : `Sell ${count} · ${inr(total)}`}
                </button>
                <div className="pair">
                  <button type="button" className="btn btn-free" disabled={count < 1} onClick={() => go("free")}>
                    Free
                  </button>
                  <button type="button" className="btn btn-due" disabled={count < 1} onClick={() => go("unpaid")}>
                    Not paid
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
