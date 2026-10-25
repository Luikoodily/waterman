"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useShop } from "@/components/shop-context"

const links = [
  { href: "/", label: "Sell", icon: IconSell },
  { href: "/stock", label: "Stock", icon: IconStock },
  { href: "/dashboard", label: "Day", icon: IconDay },
  { href: "/products", label: "Products", icon: IconProducts },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const shop = useShop()
  const path = normalize(usePathname() || "/")
  const open = shop.state.entries.filter((entry) => entry.type === "unpaid" && !entry.collectedAt).length

  return (
    <div className="wrap">
      <div className="sticky-top">
        <header className="top">
          <div className="column split">
            <p className="brand">Water Stock</p>
            <button type="button" className="undo" disabled={!shop.state.lastAction} onClick={() => shop.undo()}>
              Undo
            </button>
          </div>
        </header>
        {(shop.error || shop.message) && (
          <div className={shop.error ? "banner error" : "banner ok"} role="status">
            <span>{shop.error ?? shop.message}</span>
            <button type="button" onClick={shop.dismiss}>
              Close
            </button>
          </div>
        )}
      </div>
      <main className="column">{children}</main>
      <nav className="nav" aria-label="Shop">
        <div className="column nav-grid">
          {links.map((link) => {
            const on = path === link.href
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} aria-current={on ? "page" : undefined}>
                <Icon />
                <span>{link.label}</span>
                {link.href === "/dashboard" && open > 0 && <span className="badge">{open > 99 ? "99+" : open}</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function normalize(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1)
  return path
}

function IconSell() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2c2.2 3.4 5 6.4 5 10a5 5 0 0 1-10 0c0-3.6 2.8-6.6 5-10z" />
    </svg>
  )
}

function IconStock() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 7h16v4H4V7zm0 6h16v4H4v-4z" />
    </svg>
  )
}

function IconDay() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 3h2v2h6V3h2v2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V3zm12 8H5v8h14v-8z" />
    </svg>
  )
}

function IconProducts() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />
    </svg>
  )
}
