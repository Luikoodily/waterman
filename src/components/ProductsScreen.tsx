"use client"

import { useState } from "react"
import { useShop } from "@/components/shop-context"
import { inr, moneyInput, wholeNumber } from "@/lib/format"
import { dayKey, initialState, type Product } from "@/lib/ledger"
import { parsePersisted, serialize } from "@/lib/persist"

export function ProductsScreen() {
  const shop = useShop()
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [unit, setUnit] = useState("bottle")
  const [stock, setStock] = useState("0")

  function add(event: React.FormEvent) {
    event.preventDefault()
    const parsedPrice = moneyInput(price)
    const parsedStock = wholeNumber(stock)
    if (parsedPrice == null) {
      shop.fail("Price must be a number like 20 or 20.50.")
      return
    }
    if (parsedStock == null) {
      shop.fail("Starting stock must be a whole number, 0 or more.")
      return
    }
    const ok = shop.addProduct({ name, unit, price: parsedPrice, stock: parsedStock })
    if (ok) {
      setName("")
      setPrice("")
      setUnit("bottle")
      setStock("0")
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(serialize(shop.state), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `waterstock-${dayKey()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importBackup(file: File | undefined) {
    if (!file) return
    try {
      const next = parsePersisted(JSON.parse(await file.text()))
      const yes = window.confirm("Replace the shop on this phone with this backup?")
      if (!yes) return
      shop.replaceAll(next, "Backup loaded.")
    } catch (error) {
      shop.fail(error instanceof Error ? error.message : "Backup could not be read.")
    }
  }

  function resetShop() {
    const typed = window.prompt("This erases sales and stock on this phone. Type RESET to confirm.")
    if (typed !== "RESET") return
    shop.replaceAll(initialState(), "Shop reset.")
  }

  return (
    <>
      <h1>Products</h1>
      <form className="card" onSubmit={add}>
        <h2 style={{ marginTop: 0 }}>Add product</h2>
        <label>
          Name
          <input className="field" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Price (₹)
          <input
            className="field"
            inputMode="decimal"
            autoComplete="off"
            placeholder="20"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label>
          Unit
          <input className="field" value={unit} autoComplete="off" onChange={(event) => setUnit(event.target.value)} />
        </label>
        <label>
          Starting stock
          <input
            className="field"
            inputMode="numeric"
            autoComplete="off"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </label>
        <div className="actions">
          <button className="btn btn-sell" type="submit">
            Add product
          </button>
        </div>
      </form>

      <div className="stack">
        {shop.state.products.map((product) => (
          <ProductEditor key={product.id} product={product} />
        ))}
      </div>

      <h2>This phone</h2>
      <div className="card stack">
        <p className="hint" style={{ marginTop: 0 }}>
          Sales stay on this phone. Export a backup before you clear the browser or change phones.
        </p>
        <button type="button" className="btn btn-quiet" onClick={exportBackup}>
          Export backup
        </button>
        <label>
          Import backup
          <input
            className="field"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void importBackup(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </label>
        <button type="button" className="btn btn-danger" onClick={resetShop}>
          Reset shop
        </button>
      </div>
    </>
  )
}

function ProductEditor({ product }: { product: Product }) {
  const shop = useShop()
  const [name, setName] = useState(product.name)
  const [unit, setUnit] = useState(product.unit)
  const [price, setPrice] = useState(String(product.price))

  function save() {
    const parsed = moneyInput(price)
    if (parsed == null) {
      shop.fail("Price must be a number like 20 or 20.50.")
      return
    }
    shop.updateProduct(product.id, { name, unit, price: parsed })
  }

  return (
    <article className="card">
      <div className="split">
        <h2 style={{ margin: 0 }}>{product.name}</h2>
        <p className="price">{inr(product.price)}</p>
      </div>
      <p className="kicker">
        {product.stock} {product.unit} in stock
        {!product.active && " · hidden from Sell"}
      </p>
      <label>
        Name
        <input className="field" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Unit
        <input className="field" value={unit} autoComplete="off" onChange={(event) => setUnit(event.target.value)} />
      </label>
      <label>
        Price (₹)
        <input
          className="field"
          inputMode="decimal"
          autoComplete="off"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="button" className="btn btn-sell" onClick={save}>
          Save
        </button>
        {product.active ? (
          <button type="button" className="btn btn-quiet" onClick={() => shop.setActive(product.id, false)}>
            Hide from Sell
          </button>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => shop.setActive(product.id, true)}>
            Show on Sell
          </button>
        )}
      </div>
      <p className="hint">Change the count on Stock. Old sales keep the old price.</p>
    </article>
  )
}
