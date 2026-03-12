import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Moved from experimental in Next.js 16
  serverExternalPackages: [
    "@lucid-evolution/lucid",
    "@lucid-evolution/provider",
    "@anastasia-labs/cardano-multiplatform-lib-nodejs",
    "libsodium-wrappers-sumo",
  ],
  // Add empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;