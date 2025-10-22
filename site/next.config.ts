import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // 同时优化 ethers，避免缺少 vendor-chunks/ethers.js
    optimizePackageImports: ["ethers", "@zama-fhe/relayer-sdk"],
  },
};

export default nextConfig;



