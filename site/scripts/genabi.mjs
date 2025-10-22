import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "../../fhevm-hardhat-template");
const deploymentsDir = path.join(root, "deployments");
const outDir = path.resolve(__dirname, "../abi");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadResumeChain(chain) {
  const p = path.join(deploymentsDir, chain, "ResumeChain.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeTs(name, content) {
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, name), content);
}

function main() {
  const chains = fs.existsSync(deploymentsDir)
    ? fs.readdirSync(deploymentsDir).filter((d) => fs.statSync(path.join(deploymentsDir, d)).isDirectory())
    : [];

  const addressBook = {};
  let abi = null;

  for (const chain of chains) {
    const d = loadResumeChain(chain);
    if (!d) continue;
    const chainId = d.network?.chainId ?? undefined;
    const key = chainId ? String(chainId) : chain; // 以链ID作为键，回退到链名
    addressBook[key] = {
      chainId,
      chainName: chain,
      address: d.address,
    };
    abi = d.abi;
  }

  if (!abi) {
    console.warn("ResumeChain deployment not found. Only generating empty ABI.");
    abi = [];
  }

  writeTs(
    "ResumeChainABI.ts",
    `export const ResumeChainABI = ${JSON.stringify({ abi }, null, 2)} as const;\n`
  );

  writeTs(
    "ResumeChainAddresses.ts",
    `export const ResumeChainAddresses = ${JSON.stringify(addressBook, null, 2)} as const;\n`
  );
}

main();



