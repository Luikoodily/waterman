import type { Metadata } from "next"
import { ProductsScreen } from "@/components/ProductsScreen"

export const metadata: Metadata = { title: "Products · Water Stock" }

export default function Page() {
  return <ProductsScreen />
}
