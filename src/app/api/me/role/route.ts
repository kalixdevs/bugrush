import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEquippedForUser } from "@/lib/cosmetics";
import { bumpLastSeen } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({
      role: null, frameSrc: null, points: 0, loggedIn: false, incomingFriendCount: 0, unreadDmCount: 0,
    });
  }
  const userId = session.user.id;

  // Fire-and-forget presence bump.
  void bumpLastSeen(userId);

  const [user, equipped, incomingFriendCount, unreadDmCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, points: true },
    }),
    getEquippedForUser(userId),
    prisma.friendship.count({
      where: { toUserId: userId, status: "pending" },
    }),
    countUnreadDms(userId),
  ]);
  return NextResponse.json({
    loggedIn: true,
    role: user?.role ?? "user",
    points: user?.points ?? 0,
    frameSrc: equipped.frame?.assetUrl ?? null,
    incomingFriendCount,
    unreadDmCount,
  });
}

async function countUnreadDms(me: string): Promise<number> {
  const threads = await prisma.dmThread.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    select: { id: true, userAId: true, lastReadAtA: true, lastReadAtB: true, lastMessageAt: true },
    take: 100,
  });
  if (threads.length === 0) return 0;
  const counts = await Promise.all(
    threads.map((t) => {
      const myLastRead = t.userAId === me ? t.lastReadAtA : t.lastReadAtB;
      if (myLastRead && t.lastMessageAt <= myLastRead) return Promise.resolve(0);
      return prisma.dmMessage.count({
        where: {
          threadId: t.id,
          senderId: { not: me },
          ...(myLastRead ? { createdAt: { gt: myLastRead } } : {}),
        },
      });
    }),
  );
  return counts.reduce((a, b) => a + b, 0);
}
