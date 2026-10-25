import { describe, expect, test } from "bun:test"
import { inr } from "./format"
import {
  WATER_ID,
  addProduct,
  collect,
  countStock,
  initialState,
  restock,
  sell,
  setActive,
  shiftDay,
  summarize,
  undo,
  updateProduct,
  type Clock,
  type Result,
  type State,
} from "./ledger"
import { parsePersisted, serialize } from "./persist"

function makeClock(start = "2026-10-25T10:00:00") {
  let n = 0
  let iso = start
  const clock: Clock = {
    now: () => new Date(iso),
    id: () => {
      n += 1
      return `id-${n}`
    },
  }
  return {
    clock,
    at(next: string) {
      iso = next
    },
  }
}

function must(result: Result): State {
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe("sales", () => {
  test("paid, free, and not paid all reduce stock", () => {
    const time = makeClock()
    let state = initialState()
    state = must(restock(state, { productId: WATER_ID, qty: 10 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 2, type: "free", note: "Ravi" }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 1, type: "unpaid", note: "Asha" }, time.clock))

    expect(state.products[0]?.stock).toBe(6)
    const day = summarize(state, "2026-10-25")
    expect(day.outQty).toBe(4)
    expect(day.paidQty).toBe(1)
    expect(day.freeQty).toBe(2)
    expect(day.freeWorth).toBe(40)
    expect(day.unpaidQty).toBe(1)
    expect(day.cash).toBe(20)
    expect(day.openDueAmount).toBe(20)
    expect(day.openDues[0]?.note).toBe("Asha")
  })

  test("free and not paid need a name and do not add cash when free", () => {
    const time = makeClock()
    const stocked = must(restock(initialState(), { productId: WATER_ID, qty: 3 }, time.clock))
    const failed = sell(stocked, { productId: WATER_ID, qty: 1, type: "free" }, time.clock)
    expect(failed.ok).toBe(false)
    if (!failed.ok) expect(failed.error).toBe("Add a name for free or not paid.")
    expect(stocked.products[0]?.stock).toBe(3)

    const given = must(sell(stocked, { productId: WATER_ID, qty: 1, type: "free", note: "Guest" }, time.clock))
    expect(summarize(given, "2026-10-25").cash).toBe(0)
    expect(given.products[0]?.stock).toBe(2)
  })

  test("cannot sell more than stock or a hidden product", () => {
    const time = makeClock()
    const stocked = must(restock(initialState(), { productId: WATER_ID, qty: 1 }, time.clock))
    const sold = must(sell(stocked, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock))
    const again = sell(sold, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock)
    expect(again.ok).toBe(false)

    const hidden = must(setActive(initialState(), WATER_ID, false))
    const blocked = sell(hidden, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toBe("That product is hidden.")
  })

  test("fractional price rounds", () => {
    const time = makeClock()
    let state = must(updateProduct(initialState(), WATER_ID, { name: "Water Bottle", unit: "bottle", price: 10.1 }))
    state = must(restock(state, { productId: WATER_ID, qty: 3 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 3, type: "paid" }, time.clock))
    expect(state.entries.at(-1)?.amount).toBe(30.3)
    expect(summarize(state, "2026-10-25").cash).toBe(30.3)
  })
})

describe("dues and undo", () => {
  test("collect same day counts cash once and does not change stock", () => {
    const time = makeClock()
    let state = must(restock(initialState(), { productId: WATER_ID, qty: 5 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 1, type: "unpaid", note: "Asha" }, time.clock))
    state = must(collect(state, state.entries.at(-1)!.id, time.clock))
    const day = summarize(state, "2026-10-25")
    expect(day.cash).toBe(20)
    expect(day.outQty).toBe(1)
    expect(day.openDueAmount).toBe(0)
    expect(day.dueOpened).toBe(20)
    expect(day.dueStillOpen).toBe(0)
    expect(state.products[0]?.stock).toBe(4)
  })

  test("collect next day lands in that day's cash", () => {
    const time = makeClock("2026-10-25T10:00:00")
    let state = must(restock(initialState(), { productId: WATER_ID, qty: 5 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 1, type: "unpaid", note: "Asha" }, time.clock))
    time.at("2026-10-26T09:00:00")
    state = must(collect(state, state.entries.at(-1)!.id, time.clock))
    expect(summarize(state, "2026-10-25").cash).toBe(0)
    expect(summarize(state, "2026-10-25").outQty).toBe(1)
    expect(summarize(state, "2026-10-26").cash).toBe(20)
    expect(summarize(state, "2026-10-26").outQty).toBe(0)
    expect(state.products[0]?.stock).toBe(4)
  })

  test("undo restores the last stock change", () => {
    const time = makeClock()
    let state = must(restock(initialState(), { productId: WATER_ID, qty: 4 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock))
    state = must(undo(state))
    expect(state.products[0]?.stock).toBe(4)
    expect(summarize(state, "2026-10-25").cash).toBe(0)

    state = must(countStock(state, WATER_ID, 2, time.clock))
    expect(summarize(state, "2026-10-25").outQty).toBe(0)
    state = must(undo(state))
    expect(state.products[0]?.stock).toBe(4)
  })
})

describe("day sheet", () => {
  test("stock at end of an older day ignores later sales and restocks", () => {
    const time = makeClock("2026-10-24T09:00:00")
    let state = must(restock(initialState(), { productId: WATER_ID, qty: 10 }, time.clock))
    state = must(sell(state, { productId: WATER_ID, qty: 3, type: "paid" }, time.clock))
    time.at("2026-10-25T11:00:00")
    state = must(sell(state, { productId: WATER_ID, qty: 2, type: "paid" }, time.clock))
    state = must(restock(state, { productId: WATER_ID, qty: 6 }, time.clock))

    expect(summarize(state, "2026-10-24").byProduct[0]?.stockEnd).toBe(7)
    expect(summarize(state, "2026-10-24").outQty).toBe(3)
    expect(summarize(state, "2026-10-25").byProduct[0]?.stockEnd).toBe(11)
    expect(summarize(state, "2026-10-25").outQty).toBe(2)
    expect(state.products[0]?.stock).toBe(11)
  })

  test("other products stay separate", () => {
    const time = makeClock()
    let state = must(restock(initialState(), { productId: WATER_ID, qty: 5 }, time.clock))
    state = must(addProduct(state, { name: "Soda", unit: "can", price: 30, stock: 4 }, time.clock))
    const soda = state.products.find((product) => product.name === "Soda")
    expect(soda).toBeTruthy()
    state = must(sell(state, { productId: soda!.id, qty: 1, type: "paid" }, time.clock))
    const day = summarize(state, "2026-10-25")
    expect(day.cash).toBe(30)
    expect(day.byProduct.find((product) => product.name === "Water Bottle")?.stockEnd).toBe(5)
    expect(day.byProduct.find((product) => product.name === "Soda")?.stockEnd).toBe(3)
  })

  test("hide is refused while stock remains", () => {
    const time = makeClock()
    const state = must(restock(initialState(), { productId: WATER_ID, qty: 2 }, time.clock))
    const hidden = setActive(state, WATER_ID, false)
    expect(hidden.ok).toBe(false)
  })

  test("shiftDay crosses month boundaries", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01")
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31")
  })
})

describe("backup", () => {
  test("round trip keeps stock and rejects a newer file", () => {
    const time = makeClock()
    const state = must(restock(initialState(), { productId: WATER_ID, qty: 10 }, time.clock))
    const again = parsePersisted(serialize(state))
    expect(again.products[0]?.stock).toBe(10)
    expect(again.entries).toHaveLength(1)
    expect(() => parsePersisted({ version: 2, products: again.products, entries: [] })).toThrow(/newer/)
  })

  test("messages use rupees", () => {
    const time = makeClock()
    const state = must(restock(initialState(), { productId: WATER_ID, qty: 1 }, time.clock))
    const sold = sell(state, { productId: WATER_ID, qty: 1, type: "paid" }, time.clock)
    expect(sold.ok).toBe(true)
    if (sold.ok) expect(sold.message).toBe(`Sold 1 Water Bottle · ${inr(20)}`)
  })
})
