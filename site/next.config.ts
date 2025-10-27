import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || "";
const assetPrefix = process.env.NEXT_ASSET_PREFIX || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 静态导出以部署到 GitHub Pages
  output: "export",
  images: {
    unoptimized: true,
  },
  // 为项目页设置前缀，便于在 /resume 子路径下运行
  basePath,
  assetPrefix,
  experimental: {
    // 同时优化 ethers，避免缺少 vendor-chunks/ethers.js
    optimizePackageImports: ["ethers", "@zama-fhe/relayer-sdk"],
  },
};

export default nextConfig;



