import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const Body = z.object({ seconds: z.number().int().min(0).max(600) });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  await prisma.setting.upsert({
    where: { key: "chat.slowMode" },
    update: { value: String(parsed.data.seconds) },
    create: { key: "chat.slowMode", value: String(parsed.data.seconds) },
  });
  return NextResponse.json({ ok: true });
}
