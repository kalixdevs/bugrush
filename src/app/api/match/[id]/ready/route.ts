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

  const current = await prisma.matchParticipant.findUnique({
    where: { matchId_userId: { matchId, userId: session.user.id } },
  });
  if (!current) {
    return NextResponse.json({ error: "not in match" }, { status: 403 });
  }
  await prisma.matchParticipant.update({
    where: { matchId_userId: { matchId, userId: session.user.id } },
    data: { ready: !current.ready },
  });

  publish(`match:${matchId}`, { type: "participant_ready" });
  return NextResponse.json({ ok: true });
}
