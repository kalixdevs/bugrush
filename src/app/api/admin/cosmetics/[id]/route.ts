import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  priceCoins: z.number().int().nonnegative().max(1_000_000).nullable().optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
  enabled: z.boolean().optional(),
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
  try {
    const cosmetic = await prisma.cosmetic.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ cosmetic });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
