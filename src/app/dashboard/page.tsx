import type { Metadata } from "next"
import { DashboardScreen } from "@/components/DashboardScreen"

export const metadata: Metadata = { title: "Day · Water Stock" }

export default function Page() {
  return <DashboardScreen />
}
