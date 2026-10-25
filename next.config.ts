import type { NextConfig } from "next"

// Static files land in out/. Sales stay on the phone. No server database.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
