import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";
import { startTournament } from "@/lib/bracket";

const PatchSchema = z.object({
  action: z.enum(["start", "cancel"]),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      slots: { include: { user: { select: { id: true, handle: true, name: true } } } },
      brackets: { include: { match: { select: { id: true, status: true, winnerTeam: true } } } },
    },
  });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ tournament: t });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  if (parsed.data.action === "start") {
    try {
      await startTournament(id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "start failed";
      console.error("[sec] tournament start failed", e);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
  if (parsed.data.action === "cancel") {
    await prisma.tournament.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
