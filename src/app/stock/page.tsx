import type { Metadata } from "next"
import { StockScreen } from "@/components/StockScreen"

export const metadata: Metadata = { title: "Stock · Water Stock" }

export default function Page() {
  return <StockScreen />
}
