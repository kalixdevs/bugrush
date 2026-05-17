import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

export async function DELETE(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { code } = await ctx.params;
  try {
    await prisma.promoCode.delete({ where: { code: code.toUpperCase() } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
