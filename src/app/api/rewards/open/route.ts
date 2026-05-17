import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/daily";
import { rollRarity, COIN_FALLBACK, type Rarity } from "@/lib/cases";
import { credit } from "@/lib/economy";
import { getActiveEvent } from "@/lib/events";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const dayKey = todayKey();

  const existing = await prisma.dailyReward.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });
  if (existing) {
    return NextResponse.json({ error: "already opened today" }, { status: 409 });
  }

  const rarity = rollRarity();

  // Find candidate cosmetics at the rolled rarity that the user doesn't own.
  const owned = await prisma.userCosmetic.findMany({
    where: { userId },
    select: { cosmeticId: true },
  });
  const ownedIds = new Set(owned.map((o) => o.cosmeticId));

  const event = await getActiveEvent();
  const dropIds = event?.exclusiveDrops ?? [];
  const pool = await prisma.cosmetic.findMany({
    where: {
      enabled: true,
      OR: [
        { rarity },
        ...(dropIds.length > 0 ? [{ id: { in: dropIds } }] : []),
      ],
    },
    select: { id: true, name: true, category: true, rarity: true, assetUrl: true, cssClass: true, textValue: true },
  });
  const candidates = pool.filter((c) => !ownedIds.has(c.id));

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    await prisma.$transaction([
      prisma.userCosmetic.create({
        data: { userId, cosmeticId: pick.id, acquiredVia: "case" },
      }),
      prisma.dailyReward.create({
        data: { userId, dayKey, cosmeticId: pick.id, pointsAwarded: 0, rarity },
      }),
    ]);
    return NextResponse.json({ rarity, cosmetic: pick, coins: 0 });
  }

  // Fallback: coin payout.
  const coins = COIN_FALLBACK[rarity as Rarity];
  await credit(userId, "points", coins, "case_open");
  await prisma.dailyReward.create({
    data: { userId, dayKey, cosmeticId: null, pointsAwarded: coins, rarity },
  });
  return NextResponse.json({ rarity, cosmetic: null, coins });
}
