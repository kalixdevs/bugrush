import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

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

  const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(UPLOAD_DIR, { recursive: true });

  const userId = session.user.id;
  // Remove previous avatar files for this user (any extension).
  try {
    const files = await readdir(UPLOAD_DIR);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${userId}.`))
        .map((f) => unlink(join(UPLOAD_DIR, f)).catch(() => {})),
    );
  } catch {}

  const filename = `${userId}.${ext}`;
  await writeFile(join(UPLOAD_DIR, filename), bytes);

  const url = `/uploads/${filename}?v=${Date.now()}`;
  await prisma.user.update({
    where: { id: userId },
    data: { image: url },
  });

  return NextResponse.json({ url });
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  try {
    const files = await readdir(UPLOAD_DIR);
    await Promise.all(
      files
        .filter((f) => f.startsWith(`${userId}.`))
        .map((f) => unlink(join(UPLOAD_DIR, f)).catch(() => {})),
    );
  } catch {}

  await prisma.user.update({
    where: { id: userId },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}
