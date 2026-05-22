import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { rateLimit, rlKey } from "@/lib/rateLimit";

const Body = z.object({
  friendUserId: z.string().min(1),
  matchId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  // Tight cap: this fires a browser notification at the target, so it's a
  // spam vector if left open.
  const rl = await rateLimit(rlKey("friend-invite", me), 10, 60_000);
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
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  // Confirm we're friends.
  const friend = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: me, toUserId: parsed.data.friendUserId },
        { fromUserId: parsed.data.friendUserId, toUserId: me },
      ],
    },
  });
  if (!friend) return NextResponse.json({ error: "not friends" }, { status: 403 });

  // Confirm match exists + is in a joinable state.
  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { id: true, hostId: true, mode: true, language: true, difficulty: true, status: true },
  });
  if (!match) return NextResponse.json({ error: "match not found" }, { status: 404 });
  if (match.hostId !== me) return NextResponse.json({ error: "not host" }, { status: 403 });
  if (match.status !== "ready") return NextResponse.json({ error: "match not joinable" }, { status: 409 });

  const meRow = await prisma.user.findUnique({
    where: { id: me },
    select: { handle: true, name: true },
  });

  await publish(`user:${parsed.data.friendUserId}`, {
    type: "match-invite-received",
    matchId: match.id,
    mode: match.mode,
    language: match.language,
    difficulty: match.difficulty,
    fromHandle: meRow?.handle ?? null,
    fromName: meRow?.name ?? null,
  });

  return NextResponse.json({ ok: true });
}
