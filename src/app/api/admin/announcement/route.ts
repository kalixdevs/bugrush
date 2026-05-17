import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const Body = z.object({ value: z.string().max(280) });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  await prisma.setting.upsert({
    where: { key: "chat.announcement" },
    update: { value: parsed.data.value },
    create: { key: "chat.announcement", value: parsed.data.value },
  });
  return NextResponse.json({ ok: true });
}
