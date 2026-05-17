import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import {
  maxPlayers, pickMatchChallenge, type MatchMode, type MatchDifficulty,
} from "@/lib/match";
import type { PlayableLanguage } from "@/lib/challenges";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: matchId } = await ctx.params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (match.hostId !== session.user.id) {
    return NextResponse.json({ error: "not host" }, { status: 403 });
  }
  if (match.status !== "ready") {
    return NextResponse.json({ error: "not ready" }, { status: 409 });
  }
  const cap = maxPlayers(match.mode as MatchMode);
  if (match.participants.length !== cap) {
    return NextResponse.json({ error: "not full" }, { status: 409 });
  }
  if (!match.participants.every((p) => p.ready)) {
    return NextResponse.json({ error: "not all ready" }, { status: 409 });
  }

  const challenge = pickMatchChallenge(
    matchId,
    match.language as PlayableLanguage,
    match.difficulty as MatchDifficulty,
  );
  if (!challenge) {
    return NextResponse.json({ error: "no challenge available" }, { status: 500 });
  }

  const startedAt = new Date();
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "in_progress", startedAt, challengeId: challenge.id },
  });

  await publish(`match:${matchId}`, {
    type: "started",
    startedAt: startedAt.toISOString(),
    challenge: {
      id: challenge.id,
      title: challenge.title,
      hint: challenge.hint,
      language: challenge.language,
      broken: challenge.broken,
    },
  });
  return NextResponse.json({ ok: true });
}
