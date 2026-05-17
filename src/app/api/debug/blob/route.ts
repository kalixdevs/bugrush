import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic. Remove after the avatar bug is solved.
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const info: Record<string, unknown> = {
    tokenPresent: !!token,
    tokenPrefix: token ? token.slice(0, 20) : null,
    tokenLength: token ? token.length : 0,
    storeId: token ? token.match(/store_([a-zA-Z0-9]+)/)?.[1] ?? null : null,
  };

  if (!token) {
    return NextResponse.json({ ok: false, ...info, error: "no token in env" });
  }

  try {
    const blob = await put("debug/ping.txt", `pong ${Date.now()}`, {
      access: "public",
      contentType: "text/plain",
      addRandomSuffix: true,
    });
    await del(blob.url);
    return NextResponse.json({ ok: true, ...info, testWriteUrl: blob.url });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      ...info,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
