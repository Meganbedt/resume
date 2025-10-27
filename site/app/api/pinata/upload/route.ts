import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return new NextResponse("PINATA_JWT not configured", { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("file missing", { status: 400 });
  }

  const upstream = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: form,
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, { status: upstream.status });
  }
  return NextResponse.json(JSON.parse(text));
}



