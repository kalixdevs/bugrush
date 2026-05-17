import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  pointsMultiplier: z.number().min(0).max(10).optional(),
  rankPointsMultiplier: z.number().min(0).max(10).optional(),
  exclusiveDrops: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt) data.endsAt = new Date(parsed.data.endsAt);
  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
