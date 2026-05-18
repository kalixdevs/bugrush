import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { rateLimit, rlKey } from "@/lib/rateLimit";

const Body = z.object({ handle: z.string().min(1).max(64) });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const rl = await rateLimit(rlKey("friend_request", me), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryInMs: rl.retryInMs }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { handle: parsed.data.handle.toLowerCase().trim() },
    select: { id: true, handle: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "can't friend yourself" }, { status: 400 });

  const meRow = await prisma.user.findUnique({
    where: { id: me },
    select: { handle: true, name: true },
  });

  // Existing relationships either direction.
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromUserId: me, toUserId: target.id },
        { fromUserId: target.id, toUserId: me },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "already friends" }, { status: 409 });
    }
    if (existing.fromUserId === target.id) {
      // They requested me first → mutual accept.
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "accepted" },
      });
      await publish(`user:${target.id}`, {
        type: "friend-request-accepted",
        id: accepted.id,
        byHandle: meRow?.handle ?? null,
        byName: meRow?.name ?? null,
      });
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    return NextResponse.json({ error: "request already pending" }, { status: 409 });
  }

  const row = await prisma.friendship.create({
    data: { fromUserId: me, toUserId: target.id, status: "pending" },
  });
  await publish(`user:${target.id}`, {
    type: "friend-request-received",
    id: row.id,
    fromHandle: meRow?.handle ?? null,
    fromName: meRow?.name ?? null,
  });
  return NextResponse.json({ ok: true, status: "pending" });
}
