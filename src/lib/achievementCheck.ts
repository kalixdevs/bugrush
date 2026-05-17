import { prisma } from "./db";
import { computeStreaks } from "./streaks";
import { RANK_TIERS } from "./ranks";
import { BADGES } from "./badges";
import { publish } from "./realtime";
import { hasTopic } from "./challenges";

export async function checkAndUnlock(userId: string): Promise<string[]> {
  const [
    runs,
    hardcoreWins,
    dailyDays,
    distinctLangsAgg,
    maxScore,
    userMeta,
    existing,
  ] = await Promise.all([
    prisma.run.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { solves: true },
    }),
    prisma.run.count({
      where: {
        userId,
        difficulty: "hardcore",
        NOT: { endReason: "hardcore-fail" },
      },
    }),
    prisma.dailyAttempt.findMany({
      where: { userId },
      select: { dayKey: true },
    }),
    prisma.run.findMany({
      where: { userId },
      select: { languages: true },
    }),
    prisma.run.aggregate({
      where: { userId },
      _max: { score: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { rankPoints: true },
    }),
    prisma.achievement.findMany({
      where: { userId },
      select: { badgeId: true },
    }),
  ]);

  const runCount = runs._count._all;
  const totalSolves = runs._sum.solves ?? 0;
  const bestScore = maxScore._max.score ?? 0;
  const langs = new Set(distinctLangsAgg.flatMap((r) => r.languages));
  const { current: streak, longest: longestStreak } = computeStreaks(
    dailyDays.map((d) => d.dayKey),
  );
  const hasDailySuccess = dailyDays.length > 0;
  const rp = userMeta?.rankPoints ?? 0;
  const hackerIdx = RANK_TIERS.indexOf("hacker-1");
  const terminalIdx = RANK_TIERS.length - 1;
  const rankIdx = Math.min(Math.floor(rp / 100), terminalIdx);
  const reachedHacker = rankIdx >= hackerIdx;
  const reachedTerminal = rankIdx >= terminalIdx;

  const earnedSet = new Set(existing.map((e) => e.badgeId));

  // PvP-derived data
  const myParticipations = await prisma.matchParticipant.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          participants: { include: { user: { select: { rankPoints: true } } } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  const finishedMatches = myParticipations.filter(
    (p) => p.match.status === "finished",
  );
  let lightningFingers = false;
  let framePerfect = false;
  let raceCondition = false;
  let publicHumiliation = false;
  let clownFiesta = false;
  let smurfDetected = false;
  for (const p of finishedMatches) {
    if (p.score > 0 && p.solveTimeMs != null) {
      if (p.solveTimeMs < 3000) lightningFingers = true;
      const remaining = p.match.roundSeconds * 1000 - p.solveTimeMs;
      if (remaining > 0 && remaining < 1000) framePerfect = true;
    }
    const isWinner = p.match.winnerTeam != null && p.team === p.match.winnerTeam;
    const isLoser = p.match.winnerTeam != null && p.team !== p.match.winnerTeam;
    const allSolves = p.match.participants
      .filter((x) => x.solveTimeMs != null && x.score > 0)
      .map((x) => ({ t: x.solveTimeMs!, team: x.team }));
    if (allSolves.length === 0) clownFiesta = true;
    if (isWinner && p.solveTimeMs != null && p.score > 0) {
      const opponents = allSolves.filter((s) => s.team !== p.team);
      if (opponents.length > 0) {
        const oppEarliest = opponents.sort((a, b) => a.t - b.t)[0];
        if (Math.abs(oppEarliest.t - p.solveTimeMs) < 1000) raceCondition = true;
      }
      const opps = p.match.participants.filter((x) => x.team !== p.team);
      for (const o of opps) {
        if (o.user.rankPoints >= rp + 400) { smurfDetected = true; break; }
      }
    }
    if (isLoser) {
      const winners = allSolves.filter((s) => s.team === p.match.winnerTeam);
      const winnerEarliest = winners.length > 0
        ? winners.sort((a, b) => a.t - b.t)[0].t
        : null;
      if (winnerEarliest != null && winnerEarliest < 5000) publicHumiliation = true;
    }
  }
  // PvP win/loss streak (most recent first)
  let pvpWinStreak = 0;
  let pvpLossStreak = 0;
  for (const p of finishedMatches) {
    const isWinner = p.match.winnerTeam != null && p.team === p.match.winnerTeam;
    if (isWinner) pvpWinStreak++; else break;
  }
  for (const p of finishedMatches) {
    const isLoser = p.match.winnerTeam != null && p.team !== p.match.winnerTeam;
    if (isLoser) pvpLossStreak++; else break;
  }

  // Time-of-day + hint stats from runs.
  const runRows = await prisma.run.findMany({
    where: { userId },
    select: { createdAt: true, hintsRevealed: true },
  });
  let played3am = false;
  let lateRunCount = 0;
  let maxHintsInRound = 0;
  let totalHints = 0;
  for (const r of runRows) {
    const h = r.createdAt.getUTCHours();
    if (h === 3) played3am = true;
    if (h <= 5) lateRunCount++;
    if (r.hintsRevealed > maxHintsInRound) maxHintsInRound = r.hintsRevealed;
    totalHints += r.hintsRevealed;
  }

  // Daily + match hint counts also feed totals + max-per-round.
  const dailyHints = await prisma.dailyAttempt.findMany({
    where: { userId },
    select: { hintsRevealed: true, challengeId: true, success: true, timeMs: true },
  });
  for (const d of dailyHints) {
    if (d.hintsRevealed > maxHintsInRound) maxHintsInRound = d.hintsRevealed;
    totalHints += d.hintsRevealed;
  }
  const matchHints = await prisma.matchParticipant.findMany({
    where: { userId, hintsRevealed: { gt: 0 } },
    select: { hintsRevealed: true },
  });
  for (const m of matchHints) {
    if (m.hintsRevealed > maxHintsInRound) maxHintsInRound = m.hintsRevealed;
    totalHints += m.hintsRevealed;
  }

  // Topic-tagged solves from daily + match (Run doesn't store challenge id per solve).
  const matchSolves = await prisma.matchParticipant.findMany({
    where: { userId, score: { gt: 0 }, solveTimeMs: { not: null } },
    include: { match: { select: { challengeId: true } } },
  });
  let missingSemicolon = false;
  let nullSolves = 0;
  for (const d of dailyHints) {
    if (!d.success) continue;
    if (hasTopic(d.challengeId, "syntax") && d.timeMs < 3000) missingSemicolon = true;
    if (hasTopic(d.challengeId, "null")) nullSolves++;
  }
  for (const p of matchSolves) {
    const cid = p.match.challengeId;
    if (!cid) continue;
    if (hasTopic(cid, "syntax") && p.solveTimeMs != null && p.solveTimeMs < 3000) {
      missingSemicolon = true;
    }
    if (hasTopic(cid, "null")) nullSolves++;
  }

  const conditions: Record<string, boolean> = {
    "first-run":           runCount >= 1,
    "first-solve":         totalSolves >= 1,
    "bugs-50":             totalSolves >= 50,
    "bug-hunter-1000":     totalSolves >= 1000,
    "hc-first":            hardcoreWins >= 1,
    "hc-ten":              hardcoreWins >= 10,
    "daily-first":         hasDailySuccess,
    "streak-7":            Math.max(streak, longestStreak) >= 7,
    "streak-30":           Math.max(streak, longestStreak) >= 30,
    "polyglot":            langs.size >= 3,
    "score-1k":            bestScore >= 1000,
    "climbing-the-ladder": reachedHacker,
    "one-above-everyone":  reachedTerminal,
    "lightning-fingers":   lightningFingers,
    "frame-perfect":       framePerfect,
    "race-condition":      raceCondition,
    "undefeated":          pvpWinStreak >= 10,
    "sweaty":              pvpWinStreak >= 25,
    "burnout-simulator":   pvpLossStreak >= 5,
    "smurf-detected":      smurfDetected,
    "public-humiliation":  publicHumiliation,
    "clown-fiesta":        clownFiesta,
    "3am-deployment":      played3am,
    "caffeine-overflow":   lateRunCount >= 20,
    "stack-overflowed":            maxHintsInRound >= 3,
    "stack-overflow-tab-collector": totalHints >= 10,
    "missing-semicolon":   missingSemicolon,
    "null-and-void":       nullSolves >= 100,
  };

  const toUnlock: string[] = [];
  for (const badge of BADGES) {
    if (!badge.checkable) continue;
    if (earnedSet.has(badge.id)) continue;
    if (conditions[badge.id]) toUnlock.push(badge.id);
  }

  if (toUnlock.length === 0) return [];

  const inserted: string[] = [];
  for (const badgeId of toUnlock) {
    try {
      await prisma.achievement.create({ data: { userId, badgeId } });
      inserted.push(badgeId);
    } catch {
      // unique violation = already unlocked in a race; skip.
    }
  }

  if (inserted.length > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, handle: true, image: true },
    });
    const displayName = user?.name ?? user?.handle ?? "anon";

    for (const badgeId of inserted) {
      const badge = BADGES.find((b) => b.id === badgeId);
      if (!badge) continue;
      const broadcastBody = `${displayName} has completed ${badge.name.toUpperCase()}`;

      try {
        const row = await prisma.chatMessage.create({
          data: {
            userId,
            channel: "lfm",
            kind: "achievement",
            body: broadcastBody,
            meta: { badgeId, badgeName: badge.name, letter: badge.letter, tone: badge.tone },
          },
        });
        await publish("lfm", {
          kind: "message",
          id: row.id,
          userId,
          name: displayName,
          handle: user?.handle ?? null,
          image: user?.image ?? null,
          chatKind: "achievement",
          body: broadcastBody,
          createdAt: row.createdAt.toISOString(),
        });
      } catch { /* swallow */ }

      await publish(`user:${userId}`, {
        type: "achievement-unlocked",
        badgeId,
        badgeName: badge.name,
        letter: badge.letter,
        tone: badge.tone,
      });
    }
  }

  return inserted;
}
