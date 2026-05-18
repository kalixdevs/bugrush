import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { rateLimit } from "@/lib/rateLimit";
import { areFriends, bumpRead, isSideA, otherSide } from "@/lib/dm";

export const dynamic = "force-dynamic";

const Body = z.object({
  body: z.string().min(1).max(500),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

async function loadThread(threadId: string, me: string) {
  const thread = await prisma.dmThread.findUnique({
    where: { id: threadId },
    select: { id: true, userAId: true, userBId: true, lastReadAtA: true, lastReadAtB: true },
  });
  if (!thread) return null;
  if (thread.userAId !== me && thread.userBId !== me) return null;
  return thread;
}

export async function GET(_req: Request, ctx: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const thread = await loadThread(threadId, me);
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });

  const otherId = otherSide(thread, me);
  if (!(await areFriends(me, otherId))) {
    return NextResponse.json({ error: "not friends" }, { status: 403 });
  }

  const messages = await prisma.dmMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, senderId: true, body: true, meta: true, createdAt: true },
  });

  const readAt = await bumpRead(threadId, me, thread);
  // Notify the other side so their "seen" indicator updates.
  await publish(`user:${otherId}`, {
    type: "dm-read",
    threadId,
    readerId: me,
    readAt: readAt.toISOString(),
  });

  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, handle: true, name: true, image: true, lastSeenAt: true },
  });

  const theirLastReadAt = isSideA(thread, me) ? thread.lastReadAtB : thread.lastReadAtA;

  return NextResponse.json({
    threadId,
    other: otherUser
      ? {
          id: otherUser.id,
          handle: otherUser.handle,
          name: otherUser.name,
          image: otherUser.image,
          lastSeenAt: otherUser.lastSeenAt ? otherUser.lastSeenAt.toISOString() : null,
        }
      : null,
    theirLastReadAt: theirLastReadAt ? theirLastReadAt.toISOString() : null,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      fromMe: m.senderId === me,
      body: m.body,
      meta: m.meta ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const rl = await rateLimit(`dm-post:${me}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "slow down", retryInMs: rl.retryInMs }, { status: 429 });
  }

  const thread = await loadThread(threadId, me);
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });
  const otherId = otherSide(thread, me);
  if (!(await areFriends(me, otherId))) {
    return NextResponse.json({ error: "not friends" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const text = parsed.data.body.trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  // If meta carries a matchId, verify caller hosts that match in a joinable state.
  let meta: Record<string, unknown> | null = null;
  if (parsed.data.meta && typeof parsed.data.meta.matchId === "string") {
    const matchId = parsed.data.meta.matchId as string;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, hostId: true, mode: true, language: true, difficulty: true, status: true },
    });
    if (match && match.hostId === me && (match.status === "ready" || match.status === "in_progress")) {
      meta = {
        matchId: match.id,
        mode: match.mode,
        language: match.language,
        difficulty: match.difficulty,
        status: match.status,
      };
    }
  }

  const [row, me2] = await Promise.all([
    prisma.dmMessage.create({
      data: {
        threadId,
        senderId: me,
        body: text,
        meta: meta === null ? undefined : (meta as never),
      },
    }),
    prisma.user.findUnique({
      where: { id: me },
      select: { handle: true, name: true },
    }),
  ]);

  await prisma.dmThread.update({
    where: { id: threadId },
    data: { lastMessageAt: row.createdAt },
    select: { id: true },
  });

  const payload = {
    type: "dm-received" as const,
    threadId,
    messageId: row.id,
    senderId: me,
    senderHandle: me2?.handle ?? null,
    senderName: me2?.name ?? null,
    body: text,
    meta,
    createdAt: row.createdAt.toISOString(),
  };
  await publish(`user:${otherId}`, payload);

  return NextResponse.json({
    message: {
      id: row.id,
      senderId: me,
      fromMe: true,
      body: text,
      meta,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
