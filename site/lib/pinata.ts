export type PinResult = {
  IpfsHash: string;
  PinSize?: number;
  Timestamp?: string;
};

export async function pinFile(file: File): Promise<PinResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/pinata/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as PinResult;
}

export async function pinJSON(name: string, data: unknown): Promise<PinResult> {
  const res = await fetch("/api/pinata/pinjson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as PinResult;
}


export async function fetchJsonFromIPFS(cid: string): Promise<any> {
  // 通过本地 API 代理，避免网关的 CORS/429 问题，并做多网关兜底
  const res = await fetch(`/api/ipfs/json?cid=${cid}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}


