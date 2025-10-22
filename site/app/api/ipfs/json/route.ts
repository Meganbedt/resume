import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cid = searchParams.get("cid");
  if (!cid) {
    return new NextResponse("cid is required", { status: 400 });
  }
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
  ];
  let lastErr: any = undefined;
  for (const url of gateways) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        lastErr = `${resp.status} ${resp.statusText}`;
        continue;
      }
      const data = await resp.json();
      const res = NextResponse.json(data);
      res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  return new NextResponse(`Failed to fetch IPFS JSON: ${String(lastErr)}`, { status: 502 });
}



