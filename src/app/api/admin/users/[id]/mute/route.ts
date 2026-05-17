import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const Body = z.object({ minutes: z.number().int().min(1).max(99 * 365 * 24 * 60).nullable() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const until = parsed.data.minutes === null
    ? null
    : new Date(Date.now() + parsed.data.minutes * 60_000);

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { chatMutedUntil: until },
      select: { id: true, chatMutedUntil: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
