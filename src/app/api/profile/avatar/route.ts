import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put, del, list } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const PREFIX = "avatars/";

async function deleteExisting(userId: string): Promise<void> {
  try {
    const listing = await list({ prefix: `${PREFIX}${userId}.` });
    if (listing.blobs.length > 0) {
      await del(listing.blobs.map((b) => b.url));
    }
  } catch { /* swallow */ }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 400 });
  }

  const userId = session.user.id;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob storage not configured (BLOB_READ_WRITE_TOKEN missing)" },
      { status: 500 },
    );
  }

  try {
    await deleteExisting(userId);
    const filename = `${PREFIX}${userId}.${ext}`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    await prisma.user.update({
      where: { id: userId },
      data: { image: blob.url },
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("avatar upload failed", e);
    const msg = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteExisting(session.user.id);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });
  return NextResponse.json({ ok: true });
}
