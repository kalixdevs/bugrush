import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";
import { publish } from "@/lib/realtime";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const res = await prisma.chatMessage.deleteMany({ where: { channel: "lfm" } });
  await publish("lfm", { type: "chat-cleared" });
  return NextResponse.json({ ok: true, deleted: res.count });
}
