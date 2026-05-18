import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { poll, type Channel } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : 0;
  const matchParam = url.searchParams.get("match");

  const channels: Channel[] = ["lfm"];
  if (userId) channels.push(`user:${userId}`);

  if (matchParam && userId) {
    const [participant, match] = await Promise.all([
      prisma.matchParticipant.findUnique({
        where: { matchId_userId: { matchId: matchParam, userId } },
      }),
      prisma.match.findUnique({
        where: { id: matchParam },
        select: { privacy: true, status: true },
      }),
    ]);
    const canSpectate = match?.privacy === "public" && match?.status === "in_progress";
    if (participant || canSpectate) {
      channels.push(`match:${matchParam}` as Channel);
    }
  }

  const events = await poll(channels, isFinite(since) ? since : 0);
  const now = Date.now();
  return NextResponse.json({ events, now });
}
