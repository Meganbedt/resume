import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return new NextResponse("PINATA_JWT not configured", { status: 500 });
  }

  const body = await req.json();
  const name = body?.name ?? "resume.json";
  const data = body?.data ?? {};

  const upstream = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataMetadata: { name }, pinataContent: data }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, { status: upstream.status });
  }
  return NextResponse.json(JSON.parse(text));
}



