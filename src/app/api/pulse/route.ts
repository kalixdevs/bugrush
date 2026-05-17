import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/daily";

export const dynamic = "force-dynamic";

export async function GET() {
  const dayKey = todayKey();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [openMatches, todaySolves, recentBadge] = await Promise.all([
    prisma.match.count({ where: { status: "ready" } }),
    prisma.dailyAttempt.count({ where: { dayKey, success: true } }),
    prisma.achievement.findFirst({
      orderBy: { unlockedAt: "desc" },
      select: {
        unlockedAt: true, badgeId: true,
        user: { select: { handle: true, name: true } },
      },
    }),
  ]);

  const alerts: string[] = [];
  alerts.push(`NEW DAILY INCIDENT · ${todaySolves} SOLVED`);
  if (openMatches > 0) {
    alerts.push(`${openMatches} MATCH${openMatches === 1 ? "" : "ES"} LOOKING FOR PLAYERS`);
  }
  if (recentBadge) {
    const ageMin = Math.floor((Date.now() - recentBadge.unlockedAt.getTime()) / 60_000);
    if (ageMin < 30) {
      const who = recentBadge.user.handle ?? recentBadge.user.name ?? "someone";
      alerts.push(`${who.toUpperCase()} UNLOCKED ${recentBadge.badgeId.toUpperCase()}`);
    }
  }
  alerts.push("WATCHING THE WIRE…");

  return NextResponse.json({ alerts });
}
