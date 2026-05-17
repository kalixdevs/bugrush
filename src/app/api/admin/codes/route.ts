import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const CreateSchema = z.object({
  code: z.string().min(3).max(40),
  points: z.number().int().nonnegative().max(1_000_000).optional(),
  cosmeticIds: z.array(z.string()).max(20).optional(),
  maxUses: z.number().int().positive().max(1_000_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ codes });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: "code must be alphanumeric / _ / -" }, { status: 400 });
  }
  const reward: { points?: number; cosmeticIds?: string[] } = {};
  if (parsed.data.points && parsed.data.points > 0) reward.points = parsed.data.points;
  if (parsed.data.cosmeticIds && parsed.data.cosmeticIds.length > 0) reward.cosmeticIds = parsed.data.cosmeticIds;
  if (!reward.points && !reward.cosmeticIds) {
    return NextResponse.json({ error: "reward must include points or cosmetics" }, { status: 400 });
  }
  try {
    const row = await prisma.promoCode.create({
      data: {
        code,
        rewardJson: reward,
        maxUses: parsed.data.maxUses ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
    return NextResponse.json({ code: row });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
