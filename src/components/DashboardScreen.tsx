"use client"

import { useState } from "react"
import { useShop } from "@/components/shop-context"
import { clockTime, inr, longDay, roundMoney } from "@/lib/format"
import { dayKey, shiftDay, summarize, type Entry } from "@/lib/ledger"

export function DashboardScreen() {
  const shop = useShop()
  const today = dayKey()
  const [day, setDay] = useState(today)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const summary = summarize(shop.state, day)
  const oldPaid = shop.state.entries.filter(
    (entry) => entry.type === "unpaid" && entry.collectedDay === day && entry.day !== day,
  )
  const stockRows = summary.byProduct.filter((product) => {
    const live = shop.state.products.find((item) => item.id === product.productId)
    return product.outQty !== 0 || product.stockEnd !== 0 || live?.active !== false
  })
  const soldRows = summary.byProduct.filter((product) => product.outQty > 0)
  const freeLines = summary.lines.filter((entry) => entry.type === "free")

  return (
    <>
      <h1>Day</h1>
      <div className="daybar">
        <button type="button" className="btn btn-quiet" onClick={() => setDay((current) => shiftDay(current, -1))}>
          Prev
        </button>
        <input className="field" type="date" max={today} value={day} onChange={(event) => {
                if (event.target.value) setDay(event.target.value)
              }} />
        <button
          type="button"
          className="btn btn-quiet"
          disabled={day >= today}
          onClick={() => setDay((current) => shiftDay(current, 1))}
        >
          Next
        </button>
      </div>
      <p className="hint">
        {longDay(day)}
        {day === today ? " · today" : ""}
        {" · "}
        <button type="button" className="linkish" onClick={() => setDay(today)} style={{ background: "none", border: 0 }}>
          Jump to today
        </button>
      </p>

      <h2>{day === today ? "Stock left now" : "Stock at end of that day"}</h2>
      <div className="card">
        {stockRows.map((product) => (
          <div className="person" key={product.productId}>
            <div>
              <b>{product.name}</b>
              <span className="kicker">{product.unit}</span>
            </div>
            <p className="big">{product.stockEnd}</p>
          </div>
        ))}
      </div>

      <div className="tiles" style={{ marginTop: 12 }}>
        <div className="tile">
          <span>Sold</span>
          <strong>{summary.outQty}</strong>
        </div>
        <div className="tile">
          <span>Cash in</span>
          <strong>{inr(summary.cash)}</strong>
        </div>
        <div className="tile">
          <span>Free</span>
          <strong>{summary.freeQty}</strong>
        </div>
        <div className="tile">
          <span>Not paid, still open</span>
          <strong>{inr(summary.dueStillOpen)}</strong>
        </div>
      </div>
      <p className="hint">
        Paid {summary.paidQty} · Free {summary.freeQty} · Not paid {summary.unpaidQty}
        {summary.restockQty > 0 ? ` · Stock in ${summary.restockQty}` : ""}
      </p>

      <h2>Sold by product</h2>
      <div className="card">
        {soldRows.length === 0 && <p className="hint">No sales this day.</p>}
        {soldRows.map((product) => (
          <div className="person" key={product.productId}>
            <div>
              <b>{product.name}</b>
              <span className="kicker">
                Paid {product.paidQty} · Free {product.freeQty} · Not paid {product.unpaidQty}
              </span>
            </div>
            <div>
              <b>{product.outQty}</b>
              <span className="kicker">{inr(product.cash)}</span>
            </div>
          </div>
        ))}
      </div>

      <h2>Free</h2>
      <div className="card">
        {freeLines.length === 0 && <p className="hint">None.</p>}
        {freeLines.map((entry) => (
          <div className="person" key={entry.id}>
            <div>
              <b>{entry.note || "No name"}</b>
              <span className="kicker">
                {entry.qty} {entry.productName} · worth {inr(roundMoney(entry.unitPrice * entry.qty))}
              </span>
            </div>
            <span className="tag free">Free</span>
          </div>
        ))}
      </div>

      <h2>Still not paid · {inr(summary.openDueAmount)}</h2>
      <div className="card">
        {summary.openDues.length === 0 && <p className="hint">Nobody owes money.</p>}
        {summary.openDues.map((entry) => (
          <div className="person" key={entry.id}>
            <div>
              <b>{entry.note || "No name"}</b>
              <span className="kicker">
                {entry.qty} {entry.productName} · {longDay(entry.day)}
              </span>
            </div>
            <div>
              <b>{inr(entry.amount)}</b>
              <button type="button" className="btn btn-due" style={{ marginTop: 6 }} onClick={() => onCollect(entry.id)}>
                {confirmId === entry.id ? "Tap again" : "Got cash"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {oldPaid.length > 0 && (
        <>
          <h2>Old dues paid this day</h2>
          <div className="card">
            {oldPaid.map((entry) => (
              <div className="person" key={entry.id}>
                <div>
                  <b>{entry.note || entry.productName}</b>
                  <span className="kicker">From {longDay(entry.day)}</span>
                </div>
                <b>{inr(entry.amount)}</b>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Activity</h2>
      <div className="card">
        {summary.lines.length === 0 && <p className="hint">Nothing recorded.</p>}
        {summary.lines.map((entry) => (
          <Activity key={entry.id} entry={entry} day={day} />
        ))}
      </div>
    </>
  )

  function onCollect(id: string) {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    shop.collect(id)
    setConfirmId(null)
  }
}

function Activity({ entry, day }: { entry: Entry; day: string }) {
  const label =
    entry.type === "paid"
      ? "Paid"
      : entry.type === "free"
        ? "Free"
        : entry.type === "restock"
          ? "Stock in"
          : entry.type === "adjust"
            ? "Count"
            : !entry.collectedAt
              ? "Not paid"
              : entry.collectedDay === day
                ? "Cash in"
                : "Paid later"
  const qty = entry.type === "adjust" ? `${entry.qty > 0 ? "+" : ""}${entry.qty}` : String(entry.qty)
  const money =
    entry.type === "free" || entry.type === "restock" || entry.type === "adjust" ? inr(0) : inr(entry.amount)
  return (
    <div className="line">
      <div>
        <b>{entry.productName}</b>
        <span className="kicker">
          {clockTime(entry.at)} · {qty} {entry.unit}
          {entry.note ? ` · ${entry.note}` : ""}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <span className={`tag ${entry.type}`}>{label}</span>
        <span className="kicker">{money}</span>
      </div>
    </div>
  )
}
