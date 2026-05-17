import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDailyChallenge, scoreFor, todayKey, DAILY_DURATION_MS } from "@/lib/daily";
import { isCorrect } from "@/lib/validate";
import { credit } from "@/lib/economy";
import { coinsFromScore, POINTS_FOR_RUN } from "@/lib/ranks";
import { checkAndUnlock } from "@/lib/achievementCheck";
import { applyEventMultiplier, getActiveEvent } from "@/lib/events";
import { rateLimit, rlKey } from "@/lib/rateLimit";

const BodySchema = z.object({
  success: z.boolean(),
  timeMs: z.number().int().min(0).max(DAILY_DURATION_MS + 5_000),
  submittedCode: z.string().max(10_000).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(rlKey("daily", session.user.id), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryInMs: rl.retryInMs },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const dayKey = todayKey();
  const challenge = getDailyChallenge(dayKey);

  let success = parsed.data.success;
  if (success) {
    const code = parsed.data.submittedCode ?? "";
    if (!isCorrect(code, challenge.solution)) {
      success = false;
    }
  }

  const score = scoreFor(success, parsed.data.timeMs);

  try {
    const row = await prisma.dailyAttempt.create({
      data: {
        userId: session.user.id,
        dayKey,
        challengeId: challenge.id,
        success,
        timeMs: parsed.data.timeMs,
        score,
      },
    });
    const event = await getActiveEvent();
    const coins = await applyEventMultiplier("points", coinsFromScore(score), event);
    await credit(session.user.id, "points", coins, "daily", row.id);
    if (success) {
      const rp = await applyEventMultiplier("rankPoints", POINTS_FOR_RUN, event);
      await credit(session.user.id, "rankPoints", rp, "daily", row.id);
    }
    const newBadges = await checkAndUnlock(session.user.id);
    return NextResponse.json({ id: row.id, success, score, coinsAwarded: coins, newBadges });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "already attempted" }, { status: 409 });
    }
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
