import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const Body = z.object({
  seed: z.number().int().min(0).max(15),
  handle: z.string().min(1).max(64).nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (t.status !== "draft") {
    return NextResponse.json({ error: "tournament already started" }, { status: 409 });
  }
  if (parsed.data.seed >= t.size) {
    return NextResponse.json({ error: "seed out of range" }, { status: 400 });
  }

  let userId: string | null = null;
  if (parsed.data.handle) {
    const u = await prisma.user.findUnique({
      where: { handle: parsed.data.handle.toLowerCase() },
      select: { id: true },
    });
    if (!u) return NextResponse.json({ error: "handle not found" }, { status: 404 });
    userId = u.id;
    // No duplicates inside the same tournament.
    const dupe = await prisma.tournamentSlot.findFirst({
      where: { tournamentId: id, userId, NOT: { seed: parsed.data.seed } },
    });
    if (dupe) return NextResponse.json({ error: "user already in this tournament" }, { status: 409 });
  }

  await prisma.tournamentSlot.update({
    where: { tournamentId_seed: { tournamentId: id, seed: parsed.data.seed } },
    data: { userId },
  });
  return NextResponse.json({ ok: true });
}
