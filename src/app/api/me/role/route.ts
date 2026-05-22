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

/**
 * Total unread DM messages across all of the user's threads, in a single query.
 * "Unread" = sent by the other side and newer than the user's per-side
 * lastReadAt on that thread.
 */
async function countUnreadDms(me: string): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM "dm_message" m
      JOIN "dm_thread" t ON t."id" = m."threadId"
      WHERE m."senderId" <> ${me}
        AND (
          (t."userAId" = ${me} AND (t."lastReadAtA" IS NULL OR m."createdAt" > t."lastReadAtA"))
          OR
          (t."userBId" = ${me} AND (t."lastReadAtB" IS NULL OR m."createdAt" > t."lastReadAtB"))
        )
    `;
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
