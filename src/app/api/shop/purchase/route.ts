import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debit } from "@/lib/economy";
import { rateLimit, rlKey } from "@/lib/rateLimit";

const Body = z.object({ cosmeticId: z.string().min(1).max(80) });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(rlKey("shop_purchase", session.user.id), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryInMs: rl.retryInMs },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const cosmetic = await prisma.cosmetic.findUnique({ where: { id: parsed.data.cosmeticId } });
  if (!cosmetic || !cosmetic.enabled || cosmetic.priceCoins == null) {
    return NextResponse.json({ error: "not for sale" }, { status: 404 });
  }

  const existing = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId: session.user.id, cosmeticId: cosmetic.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "already owned" }, { status: 409 });
  }

  const ok = await debit(
    session.user.id,
    "points",
    cosmetic.priceCoins,
    `purchase_${cosmetic.id}`,
    cosmetic.id,
  );
  if (!ok) {
    return NextResponse.json({ error: "insufficient" }, { status: 402 });
  }

  await prisma.userCosmetic.create({
    data: {
      userId: session.user.id,
      cosmeticId: cosmetic.id,
      acquiredVia: "shop",
    },
  });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { points: true },
  });

  return NextResponse.json({ ok: true, points: me?.points ?? 0 });
}
