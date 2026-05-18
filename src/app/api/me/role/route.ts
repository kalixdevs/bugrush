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
      role: null, frameSrc: null, points: 0, loggedIn: false, incomingFriendCount: 0,
    });
  }
  const userId = session.user.id;

  // Fire-and-forget presence bump.
  void bumpLastSeen(userId);

  const [user, equipped, incomingFriendCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, points: true },
    }),
    getEquippedForUser(userId),
    prisma.friendship.count({
      where: { toUserId: userId, status: "pending" },
    }),
  ]);
  return NextResponse.json({
    loggedIn: true,
    role: user?.role ?? "user",
    points: user?.points ?? 0,
    frameSrc: equipped.frame?.assetUrl ?? null,
    incomingFriendCount,
  });
}
