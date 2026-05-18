import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const threads = await prisma.dmThread.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userAUser: { select: { id: true, handle: true, name: true, image: true, lastSeenAt: true } },
      userBUser: { select: { id: true, handle: true, name: true, image: true, lastSeenAt: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, senderId: true, createdAt: true, meta: true },
      },
    },
    take: 50,
  });

  // Restrict to threads where the other side is still an accepted friend.
  const otherIds = threads.map((t) => (t.userAId === me ? t.userBId : t.userAId));
  const friends = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: me, toUserId: { in: otherIds } },
        { toUserId: me, fromUserId: { in: otherIds } },
      ],
    },
    select: { fromUserId: true, toUserId: true },
  });
  const friendSet = new Set<string>();
  for (const f of friends) friendSet.add(f.fromUserId === me ? f.toUserId : f.fromUserId);

  const shaped = threads
    .filter((t) => friendSet.has(t.userAId === me ? t.userBId : t.userAId))
    .map((t) => {
      const isA = t.userAId === me;
      const otherUser = isA ? t.userBUser : t.userAUser;
      const myLastRead = isA ? t.lastReadAtA : t.lastReadAtB;
      const lastMsg = t.messages[0] ?? null;
      return {
        threadId: t.id,
        otherUserId: otherUser.id,
        handle: otherUser.handle,
        name: otherUser.name,
        image: otherUser.image,
        lastSeenAt: otherUser.lastSeenAt ? otherUser.lastSeenAt.toISOString() : null,
        lastMessageAt: t.lastMessageAt.toISOString(),
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              fromMe: lastMsg.senderId === me,
              createdAt: lastMsg.createdAt.toISOString(),
              hasMeta: !!lastMsg.meta,
            }
          : null,
        myLastReadAt: myLastRead ? myLastRead.toISOString() : null,
      };
    });

  // Per-thread unread count.
  const unreadCounts = await Promise.all(
    shaped.map(async (s) => {
      const since = s.myLastReadAt ? new Date(s.myLastReadAt) : new Date(0);
      const n = await prisma.dmMessage.count({
        where: {
          threadId: s.threadId,
          senderId: { not: me },
          createdAt: { gt: since },
        },
      });
      return n;
    }),
  );

  const out = shaped.map((s, i) => ({ ...s, unread: unreadCounts[i] }));
  const totalUnread = out.reduce((acc, t) => acc + t.unread, 0);

  return NextResponse.json({ threads: out, totalUnread });
}
