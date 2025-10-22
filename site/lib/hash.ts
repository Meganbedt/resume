import { keccak256, toUtf8Bytes } from "ethers";

export function hashJsonStable(obj: unknown): `0x${string}` {
  const s = JSON.stringify(obj, Object.keys(obj as object).sort());
  return keccak256(toUtf8Bytes(s)) as `0x${string}`;
}




