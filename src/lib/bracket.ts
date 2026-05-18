import { prisma } from "./db";
import { pickMatchChallenge, type MatchDifficulty } from "./match";
import type { PlayableLanguage } from "./challenges";

export const TOURNAMENT_SIZES = [4, 8, 16] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

/**
 * Standard single-elimination seeding so the top seeds meet last.
 * Returns round-0 pairs of seeds for the given size.
 */
export function seedPairs(size: number): Array<[number, number]> {
  // Build a bracket-friendly seed order recursively.
  let order: number[] = [0, 1];
  let s = 2;
  while (s < size) {
    const next: number[] = [];
    for (const v of order) {
      next.push(v);
      next.push(s * 2 - 1 - v);
    }
    order = next;
    s *= 2;
  }
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < size; i += 2) pairs.push([order[i], order[i + 1]]);
  return pairs;
}

export function totalRounds(size: number): number {
  return Math.log2(size);
}

type BracketSlotShape = { round: number; position: number };

export function parentSlot(round: number, position: number): BracketSlotShape {
  return { round: round + 1, position: Math.floor(position / 2) };
}

export function isPlayer1Side(position: number): boolean {
  return position % 2 === 0;
}

/**
 * Called once after admins assign all slots and hit START.
 * Creates the full bracket shell + round-0 Match rows.
 */
export async function startTournament(tournamentId: string): Promise<void> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { slots: true },
  });
  if (!t) throw new Error("tournament not found");
  if (t.status !== "draft") throw new Error("tournament not in draft");
  if (t.slots.length !== t.size) throw new Error("slots not filled");
  if (t.slots.some((s) => s.userId == null)) {
    throw new Error("every slot needs a player");
  }

  const slotByseed = new Map(t.slots.map((s) => [s.seed, s.userId!]));
  const rounds = totalRounds(t.size);
  const pairs = seedPairs(t.size);

  // Create round-0 BracketMatch rows + their Match rows.
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    const p1 = slotByseed.get(a)!;
    const p2 = slotByseed.get(b)!;
    const match = await prisma.match.create({
      data: {
        hostId: p1,
        mode: "1v1",
        privacy: "public",
        difficulty: t.difficulty,
        language: t.language,
        roundSeconds: t.roundSeconds,
        status: "ready",
        participants: {
          create: [
            { userId: p1, team: 0, ready: true },
            { userId: p2, team: 1, ready: true },
          ],
        },
      },
    });
    await prisma.bracketMatch.create({
      data: {
        tournamentId,
        round: 0,
        position: i,
        player1Id: p1,
        player2Id: p2,
        matchId: match.id,
      },
    });
    // Auto-start the round-0 match so it's in_progress immediately.
    const challenge = pickMatchChallenge(
      match.id,
      t.language as PlayableLanguage,
      t.difficulty as MatchDifficulty,
    );
    if (challenge) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "in_progress",
          startedAt: new Date(),
          challengeId: challenge.id,
        },
      });
    }
  }

  // Create empty shells for later rounds.
  for (let r = 1; r < rounds; r++) {
    const slots = t.size / Math.pow(2, r + 1);
    for (let p = 0; p < slots; p++) {
      await prisma.bracketMatch.create({
        data: { tournamentId, round: r, position: p },
      });
    }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "in_progress", startedAt: new Date() },
  });
}

/**
 * Called from match settlement when a bracket-linked match finishes.
 * Records the winner and (if both feeders are done) creates the next-round Match.
 */
export async function advanceWinner(
  bracketMatchId: string,
  winnerUserId: string,
): Promise<void> {
  const bm = await prisma.bracketMatch.findUnique({
    where: { id: bracketMatchId },
    include: { tournament: true },
  });
  if (!bm || bm.winnerUserId) return; // idempotent
  await prisma.bracketMatch.update({
    where: { id: bracketMatchId },
    data: { winnerUserId },
  });

  const t = bm.tournament;
  const maxRound = totalRounds(t.size) - 1;
  if (bm.round === maxRound) {
    await prisma.tournament.update({
      where: { id: t.id },
      data: { status: "finished", finishedAt: new Date(), winnerUserId },
    });
    return;
  }

  const parent = parentSlot(bm.round, bm.position);
  const parentRow = await prisma.bracketMatch.findUnique({
    where: {
      tournamentId_round_position: {
        tournamentId: t.id,
        round: parent.round,
        position: parent.position,
      },
    },
  });
  if (!parentRow) return;

  const updates: { player1Id?: string; player2Id?: string } = {};
  if (isPlayer1Side(bm.position)) updates.player1Id = winnerUserId;
  else updates.player2Id = winnerUserId;

  const updated = await prisma.bracketMatch.update({
    where: { id: parentRow.id },
    data: updates,
  });

  // If both players known and no match yet, materialize the next match.
  const p1 = updated.player1Id;
  const p2 = updated.player2Id;
  if (p1 && p2 && !updated.matchId) {
    const match = await prisma.match.create({
      data: {
        hostId: p1,
        mode: "1v1",
        privacy: "public",
        difficulty: t.difficulty,
        language: t.language,
        roundSeconds: t.roundSeconds,
        status: "ready",
        participants: {
          create: [
            { userId: p1, team: 0, ready: true },
            { userId: p2, team: 1, ready: true },
          ],
        },
      },
    });
    const challenge = pickMatchChallenge(
      match.id,
      t.language as PlayableLanguage,
      t.difficulty as MatchDifficulty,
    );
    if (challenge) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "in_progress",
          startedAt: new Date(),
          challengeId: challenge.id,
        },
      });
    }
    await prisma.bracketMatch.update({
      where: { id: updated.id },
      data: { matchId: match.id },
    });
  }
}
