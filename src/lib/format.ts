export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function inr(n: number) {
  const rounded = roundMoney(n)
  const [whole, frac] = rounded.toFixed(2).split(".")
  const grouped = Number(whole).toLocaleString("en-IN")
  if (frac === "00") return `₹${grouped}`
  return `₹${grouped}.${frac}`
}

export function wholeNumber(value: string) {
  if (!/^\d+$/.test(value.trim())) return null
  const n = Number(value)
  if (!Number.isSafeInteger(n)) return null
  return n
}

export function moneyInput(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null
  return roundMoney(Number(value))
}

export function longDay(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  if (!y || !m || !d) return day
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function clockTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}
