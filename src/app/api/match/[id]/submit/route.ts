import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { challenges } from "@/lib/challenges";
import { isCorrect } from "@/lib/validate";
import { credit } from "@/lib/economy";
import {
  coinsFromScore, POINTS_FOR_PVP_WIN, POINTS_FOR_PVP_LOSS,
} from "@/lib/ranks";
import { scoreFor, determineWinner } from "@/lib/match";
import { checkAndUnlock } from "@/lib/achievementCheck";
import { applyEventMultiplier, getActiveEvent } from "@/lib/events";

const Body = z.object({ submittedCode: z.string().min(0).max(10_000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: matchId } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (match.status !== "in_progress" || !match.startedAt || !match.challengeId) {
    return NextResponse.json({ error: "not in progress" }, { status: 409 });
  }
  const me = match.participants.find((p) => p.userId === session.user.id);
  if (!me) return NextResponse.json({ error: "not a participant" }, { status: 403 });
  if (me.solveTimeMs != null || me.submittedCode != null) {
    return NextResponse.json({ error: "already submitted" }, { status: 409 });
  }

  const elapsed = Date.now() - match.startedAt.getTime();
  const cap = match.roundSeconds * 1000 + 2000;
  if (elapsed > cap) {
    return NextResponse.json({ error: "round over" }, { status: 410 });
  }

  const challenge = challenges.find((c) => c.id === match.challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "challenge missing" }, { status: 500 });
  }

  const success = isCorrect(parsed.data.submittedCode, challenge.solution);
  const solveTimeMs = success ? Math.min(elapsed, match.roundSeconds * 1000) : elapsed;
  const score = scoreFor(success, solveTimeMs);

  await prisma.matchParticipant.update({
    where: { matchId_userId: { matchId, userId: session.user.id } },
    data: {
      score,
      solveTimeMs,
      submittedCode: parsed.data.submittedCode,
    },
  });

  await publish(`match:${matchId}`, {
    type: "participant_solved",
    userId: session.user.id,
    success,
    score,
  });

  // Settle if everyone has submitted OR clock has expired.
  const after = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });
  if (after && after.status === "in_progress") {
    const everySubmitted = after.participants.every((p) => p.solveTimeMs != null);
    const timeUp = Date.now() - after.startedAt!.getTime() > after.roundSeconds * 1000;
    if (everySubmitted || timeUp) {
      await settle(matchId);
    }
  }

  return NextResponse.json({ ok: true, success, score });
}

async function settle(matchId: string): Promise<void> {
  const result = await prisma.$transaction(async (tx) => {
    const m = await tx.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });
    if (!m || m.status !== "in_progress") return null;
    const winnerTeam = determineWinner(
      m.participants.map((p) => ({ team: p.team, score: p.score, solveTimeMs: p.solveTimeMs })),
    );
    await tx.match.update({
      where: { id: matchId },
      data: { status: "finished", finishedAt: new Date(), winnerTeam },
    });
    return { match: m, winnerTeam };
  });

  if (!result) return;

  const event = await getActiveEvent();
  for (const p of result.match.participants) {
    const isWinner = result.winnerTeam != null && p.team === result.winnerTeam;
    const baseRank = result.winnerTeam == null
      ? 0
      : isWinner ? POINTS_FOR_PVP_WIN : POINTS_FOR_PVP_LOSS;
    const baseCoins = isWinner
      ? coinsFromScore(p.score)
      : Math.floor(coinsFromScore(p.score) / 2);
    const rankAward = await applyEventMultiplier("rankPoints", baseRank, event);
    const coinAward = await applyEventMultiplier("points", baseCoins, event);
    if (rankAward > 0) await credit(p.userId, "rankPoints", rankAward, "pvp", matchId);
    if (coinAward > 0) await credit(p.userId, "points", coinAward, "pvp", matchId);
    await checkAndUnlock(p.userId);
  }

  await publish(`match:${matchId}`, {
    type: "finished",
    winnerTeam: result.winnerTeam,
  });
}
