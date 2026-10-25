import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/Providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Water Stock",
  description: "Track bottle sales, free bottles, unpaid money, and stock left.",
  applicationName: "Water Stock",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Water Stock",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#083044",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
