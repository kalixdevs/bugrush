import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";
import { credit } from "@/lib/economy";

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("points"), amount: z.number().int().min(-1_000_000).max(1_000_000) }),
  z.object({ kind: z.literal("rankPoints"), amount: z.number().int().min(-1_000_000).max(1_000_000) }),
  z.object({ kind: z.literal("cosmetic"), cosmeticId: z.string().min(1) }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, points: true, rankPoints: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (parsed.data.kind === "cosmetic") {
    const cosmetic = await prisma.cosmetic.findUnique({ where: { id: parsed.data.cosmeticId } });
    if (!cosmetic) return NextResponse.json({ error: "cosmetic not found" }, { status: 404 });
    try {
      await prisma.userCosmetic.create({
        data: { userId: id, cosmeticId: parsed.data.cosmeticId, acquiredVia: "admin" },
      });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") {
        return NextResponse.json({ error: "user already owns this cosmetic" }, { status: 409 });
      }
      throw e;
    }
    return NextResponse.json({ ok: true });
  }

  // Reject debits that would drive the balance negative.
  if (parsed.data.amount < 0) {
    const current = parsed.data.kind === "points" ? target.points : target.rankPoints;
    if (current + parsed.data.amount < 0) {
      console.error(`[sec] admin ${admin.id} attempted overdraft on user ${id} (${parsed.data.kind} ${parsed.data.amount} vs ${current})`);
      return NextResponse.json(
        { error: "insufficient balance", current },
        { status: 400 },
      );
    }
  }

  await credit(id, parsed.data.kind, parsed.data.amount, "admin_grant", admin.id);
  return NextResponse.json({ ok: true });
}
