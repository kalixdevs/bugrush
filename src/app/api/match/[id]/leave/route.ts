import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: matchId } = await ctx.params;

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { participants: { orderBy: { joinedAt: "asc" } } },
    });
    if (!match || match.status !== "ready") return;

    await tx.matchParticipant.deleteMany({
      where: { matchId, userId: session.user.id },
    });

    const remaining = match.participants.filter((p) => p.userId !== session.user.id);
    if (remaining.length === 0) {
      await tx.match.update({
        where: { id: matchId },
        data: { status: "cancelled" },
      });
    } else if (match.hostId === session.user.id) {
      await tx.match.update({
        where: { id: matchId },
        data: { hostId: remaining[0].userId },
      });
    }
  });

  await publish(`match:${matchId}`, { type: "participant_left" });
  return NextResponse.json({ ok: true });
}
