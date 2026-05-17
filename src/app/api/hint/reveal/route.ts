import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debit } from "@/lib/economy";
import { rateLimit, rlKey } from "@/lib/rateLimit";

export const HINT_COST = 5;

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(rlKey("hint", session.user.id), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryInMs: rl.retryInMs },
      { status: 429 },
    );
  }

  const ok = await debit(session.user.id, "points", HINT_COST, "hint");
  if (!ok) {
    return NextResponse.json({ error: "insufficient" }, { status: 402 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { points: true },
  });
  return NextResponse.json({ ok: true, balance: me?.points ?? 0 });
}
