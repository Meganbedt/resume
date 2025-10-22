"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { ResumeChainABI } from "../abi/ResumeChainABI";
import { ResumeChainAddresses } from "../abi/ResumeChainAddresses";
import type { FhevmInstance } from "../fhevm/internal/fhevm";

export function getResumeChainByChainId(chainId: number | undefined): {
  address?: `0x${string}`;
  abi: typeof ResumeChainABI.abi;
  chainId?: number;
  chainName?: string;
} {
  if (!chainId) return { abi: ResumeChainABI.abi };
  // 1) 直接用链ID命中
  let entry = (ResumeChainAddresses as any)[String(chainId)];
  // 2) 兜底：遍历表，按 chainId/chainName 匹配
  if (!entry) {
    const values = Object.values(ResumeChainAddresses as any) as any[];
    entry = values.find((v) => v?.chainId === chainId) || values.find((v) => (v?.chainName || "").toLowerCase() === "sepolia" && chainId === 11155111);
  }
  if (!entry || !entry.address || entry.address === ethers.ZeroAddress) {
    return { abi: ResumeChainABI.abi, chainId };
  }
  return { address: entry.address as `0x${string}`, abi: ResumeChainABI.abi, chainId, chainName: entry.chainName };
}

export function useResumeChain(parameters: {
  instance: FhevmInstance | undefined;
  chainId: number | undefined;
  signer: ethers.Signer | undefined;
  readonlyProvider: ethers.ContractRunner | undefined;
}) {
  const { instance, chainId, signer, readonlyProvider } = parameters;
  const [message, setMessage] = useState<string>("");
  const [resumeId, setResumeId] = useState<number | undefined>(undefined);
  const [sectionHash, setSectionHash] = useState<string | undefined>(undefined);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const metaRef = useRef<ReturnType<typeof getResumeChainByChainId> | undefined>(undefined);

  const meta = useMemo(() => {
    const m = getResumeChainByChainId(chainId);
    metaRef.current = m;
    return m;
  }, [chainId]);

  const canCallWrite = useMemo(() => !!(meta.address && signer), [meta.address, signer]);
  const canCallRead = useMemo(
    () => !!(meta.address && (readonlyProvider || signer)),
    [meta.address, readonlyProvider, signer]
  );

  const createResume = useCallback(
    async (resumeHash: `0x${string}`, isPublic: boolean): Promise<{ txHash: string; resumeId?: number }> => {
      if (!canCallWrite || !meta.address || !signer) {
        throw new Error("无法上链：请连接钱包并切换到部署网络（含ABI/地址）");
      }
      const c = new ethers.Contract(meta.address, meta.abi, signer);
      const tx = await c.createResume(resumeHash, isPublic);
      const receipt = await tx.wait();
      const ev = receipt?.logs?.map((l: any) => c.interface.parseLog(l)).find((e: any) => e?.name === "ResumeCreated");
      let newId: number | undefined = undefined;
      if (ev) {
        newId = Number(ev.args[0]);
        setResumeId(newId);
        setMessage(`ResumeCreated id=${newId}`);
      }
      return { txHash: tx.hash, resumeId: newId };
    },
    [canCallWrite, meta.address, meta.abi, signer]
  );

  const updateResume = useCallback(async (id: number, newHash: `0x${string}`, isPublic: boolean) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.updateResume(id, newHash, isPublic);
    await tx.wait();
    setMessage(`ResumeUpdated id=${id}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const upsertSection = useCallback(async (id: number, shash: `0x${string}`) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.upsertSection(id, shash);
    await tx.wait();
    setSectionHash(shash);
    setMessage(`SectionUpserted id=${id}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const endorseSection = useCallback(async (id: number, shash: `0x${string}`) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.endorseSection(id, shash);
    await tx.wait();
    setMessage(`Endorsed ${id}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const endorseResume = useCallback(async (id: number) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.endorseResume(id);
    await tx.wait();
    setMessage(`Endorsed resume ${id}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const grantAccess = useCallback(async (id: number, viewer: `0x${string}`) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.grantAccess(id, viewer);
    await tx.wait();
    setMessage(`AccessGranted -> ${viewer}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const revokeAccess = useCallback(async (id: number, viewer: `0x${string}`) => {
    if (!canCallWrite || !meta.address || !signer) return;
    const c = new ethers.Contract(meta.address, meta.abi, signer);
    const tx = await c.revokeAccess(id, viewer);
    await tx.wait();
    setMessage(`AccessRevoked -> ${viewer}`);
  }, [canCallWrite, meta.address, meta.abi, signer]);

  const getResume = useCallback(async (id: number) => {
    const runner = signer ?? readonlyProvider;
    if (!canCallRead || !meta.address || !runner) return undefined;
    const c = new ethers.Contract(meta.address, meta.abi, runner);
    const from = signer ? await signer.getAddress() : undefined;
    // 显式指定 from，确保合约内 msg.sender 正确，从而返回对应访问句柄
    return await (from ? c.getResume(id, { from }) : c.getResume(id));
  }, [canCallRead, meta.address, meta.abi, signer, readonlyProvider]);

  const getEncryptedEndorsementCount = useCallback(async (id: number, shash: `0x${string}`) => {
    const runner = signer ?? readonlyProvider;
    if (!canCallRead || !meta.address || !runner) return undefined;
    const c = new ethers.Contract(meta.address, meta.abi, runner);
    return await c.getEncryptedEndorsementCount(id, shash);
  }, [canCallRead, meta.address, meta.abi, signer, readonlyProvider]);

  const listMyResumes = useCallback(
    async (owner: `0x${string}`): Promise<
      Array<{
        id: number;
        owner: string;
        resumeHash: string;
        isPublic: boolean;
        createdAt: number;
        updatedAt: number;
        callerAccess: string; // encrypted handle (bytes32)
      }>
    > => {
      const runner = signer ?? readonlyProvider;
      if (!canCallRead || !meta.address || !runner) return [];
      const c = new ethers.Contract(meta.address, meta.abi, runner);
      const next: bigint = await c.nextResumeId();
      const last = Number(next) - 1;
      const out: any[] = [];
      for (let i = 1; i <= last; i++) {
        try {
          const from = signer ? await signer.getAddress() : undefined;
          const r = await (from ? c.getResume(i, { from }) : c.getResume(i));
          const o = String(r[0]).toLowerCase();
          if (o === String(owner).toLowerCase()) {
            out.push({
              id: i,
              owner: r[0] as string,
              resumeHash: (r[1] as string),
              isPublic: Boolean(r[2]),
              createdAt: Number(r[3]),
              updatedAt: Number(r[4]),
              callerAccess: r[5] as string,
            });
          }
        } catch {}
      }
      return out;
    },
    [canCallRead, meta.address, meta.abi, signer, readonlyProvider]
  );

  const listPublicResumes = useCallback(
    async (): Promise<
      Array<{
        id: number;
        owner: string;
        resumeHash: string;
        isPublic: boolean;
        createdAt: number;
        updatedAt: number;
      }>
    > => {
      if (!canCallRead || !meta.address || !readonlyProvider) return [];
      const c = new ethers.Contract(meta.address, meta.abi, readonlyProvider);
      const next: bigint = await c.nextResumeId();
      const last = Number(next) - 1;
      const out: any[] = [];
      for (let i = 1; i <= last; i++) {
        try {
          const r = await c.getResume(i);
          const isPublic = Boolean(r[2]);
          if (isPublic) {
            out.push({
              id: i,
              owner: r[0] as string,
              resumeHash: r[1] as string,
              isPublic,
              createdAt: Number(r[3]),
              updatedAt: Number(r[4]),
            });
          }
        } catch {}
      }
      return out;
    },
    [canCallRead, meta.address, meta.abi, readonlyProvider]
  );

  const decryptHandles = useCallback(
    async (contractAddress: `0x${string}`, handles: string[]): Promise<Record<string, any>> => {
      if (!instance || !signer || handles.length === 0) return {};
      // filter zero handle
      const hs = handles.filter((h) => h && h !== ethers.ZeroHash);
      if (hs.length === 0) return {};
      // generate keypair and EIP712, sign typed data
      const { publicKey, privateKey } = instance.generateKeypair();
      const user = (await signer.getAddress()) as `0x${string}`;
      const start = Math.floor(Date.now() / 1000);
      const durationDays = 365;
      const eip = instance.createEIP712(publicKey, [contractAddress], start, durationDays);
      const sig = await (signer as any).signTypedData(
        eip.domain,
        { UserDecryptRequestVerification: eip.types.UserDecryptRequestVerification },
        eip.message
      );
      const req = hs.map((h) => ({ handle: h, contractAddress }));
      const rawResult = await instance.userDecrypt(
        req,
        privateKey,
        publicKey,
        sig,
        [contractAddress],
        user,
        start,
        durationDays
      );
      // 标准化输出：用输入的原始 handle 作为键，值为布尔/数值
      const result: Record<string, any> = {};
      const obj: any = rawResult;
      const tryGet = (r: any, keyRaw: string): any => {
        try {
          const kNorm = ethers.toBeHex(ethers.toBigInt(keyRaw), 32);
          if (r && Object.prototype.hasOwnProperty.call(r, kNorm)) return r[kNorm];
        } catch {}
        if (r && Object.prototype.hasOwnProperty.call(r, keyRaw)) return r[keyRaw];
        if (r && typeof r === "object") {
          const kv = Object.entries(r).find(([k]) => {
            try { return ethers.toBigInt(k) === ethers.toBigInt(keyRaw); } catch { return false; }
          });
          if (kv) return kv[1];
        }
        return undefined;
      };
      // 1) 对象型返回
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (let i = 0; i < hs.length; i++) {
          const h = hs[i];
          result[h] = tryGet(obj, h);
        }
      } else if (Array.isArray(obj)) {
        // 2) 数组型：按顺序对应
        for (let i = 0; i < hs.length; i++) {
          result[hs[i]] = obj[i];
        }
      } else {
        // 3) 兜底：单个值
        if (hs.length === 1) result[hs[0]] = obj;
      }
      return result;
    },
    [instance, signer]
  );

  return {
    address: meta.address,
    abi: meta.abi,
    message,
    resumeId,
    sectionHash,
    isBusy,
    createResume,
    updateResume,
    upsertSection,
    endorseSection,
    endorseResume,
    grantAccess,
    revokeAccess,
    getResume,
    getEncryptedEndorsementCount,
    listMyResumes,
    listPublicResumes,
    decryptHandles,
  };
}



