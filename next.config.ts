import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle — keeps the container image small.
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
