# ResumeChain Site

开发说明：
- 本地 Mock：要求本地 Hardhat 节点 + FHEVM 元数据可用；使用 `@fhevm/mock-utils` 动态导入。
- 测试网 Sepolia：通过 CDN 注入 `@zama-fhe/relayer-sdk`，创建 FHEVM 实例并进行加解密。

脚本：
- `npm run dev:mock`：检查本地节点 → 生成 ABI → 启动 Next。
- `npm run dev`：生成 ABI → 启动 Next（默认 Relayer SDK）。



