import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { maxPlayers, type MatchMode } from "@/lib/match";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: matchId } = await ctx.params;

  try {
    await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { participants: true },
      });
      if (!match) throw new Error("not found");
      if (match.status !== "ready") throw new Error("not joinable");
      const existing = match.participants.find((p) => p.userId === session.user.id);
      if (existing) return;
      const cap = maxPlayers(match.mode as MatchMode);
      if (match.participants.length >= cap) throw new Error("full");

      const team0Count = match.participants.filter((p) => p.team === 0).length;
      const team1Count = match.participants.filter((p) => p.team === 1).length;
      const team = team0Count <= team1Count ? 0 : 1;

      await tx.matchParticipant.create({
        data: { matchId, userId: session.user.id, team },
      });
    });
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message ?? "failed";
    const code = msg === "not found" ? 404 : msg === "full" ? 409 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }

  await publish(`match:${matchId}`, { type: "participant_joined" });
  return NextResponse.json({ ok: true });
}
