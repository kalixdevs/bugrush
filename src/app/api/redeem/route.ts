import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { credit } from "@/lib/economy";

const Body = z.object({ code: z.string().min(1).max(40) });

const RewardSchema = z.object({
  points: z.number().int().nonnegative().optional(),
  cosmeticIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const code = parsed.data.code.trim().toUpperCase();

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) {
    return NextResponse.json({ error: "invalid code" }, { status: 404 });
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ error: "code expired" }, { status: 410 });
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return NextResponse.json({ error: "code exhausted" }, { status: 410 });
  }

  const already = await prisma.promoRedemption.findUnique({
    where: { userId_code: { userId: session.user.id, code } },
  });
  if (already) {
    return NextResponse.json({ error: "already redeemed" }, { status: 409 });
  }

  const reward = RewardSchema.safeParse(promo.rewardJson);
  if (!reward.success) {
    return NextResponse.json({ error: "code is malformed" }, { status: 500 });
  }

  let grantedCosmetics = 0;
  if (reward.data.cosmeticIds && reward.data.cosmeticIds.length > 0) {
    for (const cosmeticId of reward.data.cosmeticIds) {
      const exists = await prisma.cosmetic.findUnique({ where: { id: cosmeticId } });
      if (!exists) continue;
      try {
        await prisma.userCosmetic.create({
          data: { userId: session.user.id, cosmeticId, acquiredVia: "promo" },
        });
        grantedCosmetics++;
      } catch {
        // unique violation = already owned; skip
      }
    }
  }

  if (reward.data.points && reward.data.points > 0) {
    await credit(session.user.id, "points", reward.data.points, `promo_${code}`, code);
  }

  await prisma.$transaction([
    prisma.promoRedemption.create({
      data: { userId: session.user.id, code },
    }),
    prisma.promoCode.update({
      where: { code },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    pointsAwarded: reward.data.points ?? 0,
    cosmeticsGranted: grantedCosmetics,
  });
}
