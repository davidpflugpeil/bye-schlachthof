import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle — keeps the container image small.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
