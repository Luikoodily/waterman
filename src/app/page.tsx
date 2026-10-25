import type { Metadata } from "next"
import { SellScreen } from "@/components/SellScreen"

export const metadata: Metadata = { title: "Sell · Water Stock" }

export default function Page() {
  return <SellScreen />
}
