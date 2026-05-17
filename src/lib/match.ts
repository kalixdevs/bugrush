import {
  challenges,
  type Challenge,
  type PlayableLanguage,
  type Difficulty,
} from "./challenges";

export const MATCH_MODES = ["1v1", "2v2", "3v3"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const MATCH_PRIVACY = ["public", "private"] as const;
export type MatchPrivacy = (typeof MATCH_PRIVACY)[number];

export const MATCH_ROUND_SECONDS = [30, 60, 120] as const;

export type MatchDifficulty = Difficulty | "hardcore";

export function teamSize(mode: MatchMode): number {
  return mode === "1v1" ? 1 : mode === "2v2" ? 2 : 3;
}
export function maxPlayers(mode: MatchMode): number {
  return teamSize(mode) * 2;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function pickMatchChallenge(
  matchId: string,
  language: PlayableLanguage,
  difficulty: MatchDifficulty,
): Challenge | null {
  const diff: Difficulty = difficulty === "hardcore" ? "hard" : difficulty;
  const pool = challenges
    .filter((c) => c.language === language && c.difficulty === diff)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return null;
  const idx = fnv1a(matchId) % pool.length;
  return pool[idx];
}

export function scoreFor(success: boolean, solveTimeMs: number): number {
  if (!success) return 0;
  return Math.max(100, Math.min(1000, 1000 - Math.floor(solveTimeMs / 60)));
}

export function isMatchExpired(m: { status: string; createdAt: Date }): boolean {
  if (m.status !== "ready") return false;
  return Date.now() - m.createdAt.getTime() > 30 * 60 * 1000;
}

export function computeTeamTotals(
  participants: Array<{ team: number; score: number; solveTimeMs: number | null }>,
): { team0: number; team1: number; team0EarliestMs: number | null; team1EarliestMs: number | null } {
  let team0 = 0, team1 = 0;
  let team0Earliest: number | null = null;
  let team1Earliest: number | null = null;
  for (const p of participants) {
    if (p.team === 0) {
      team0 += p.score;
      if (p.score > 0 && p.solveTimeMs != null) {
        team0Earliest = team0Earliest == null ? p.solveTimeMs : Math.min(team0Earliest, p.solveTimeMs);
      }
    } else if (p.team === 1) {
      team1 += p.score;
      if (p.score > 0 && p.solveTimeMs != null) {
        team1Earliest = team1Earliest == null ? p.solveTimeMs : Math.min(team1Earliest, p.solveTimeMs);
      }
    }
  }
  return { team0, team1, team0EarliestMs: team0Earliest, team1EarliestMs: team1Earliest };
}

export function determineWinner(
  participants: Array<{ team: number; score: number; solveTimeMs: number | null }>,
): number | null {
  const t = computeTeamTotals(participants);
  if (t.team0 === 0 && t.team1 === 0) return null;
  if (t.team0 > t.team1) return 0;
  if (t.team1 > t.team0) return 1;
  // tiebreak: earliest solve wins
  if (t.team0EarliestMs != null && (t.team1EarliestMs == null || t.team0EarliestMs < t.team1EarliestMs)) return 0;
  if (t.team1EarliestMs != null && (t.team0EarliestMs == null || t.team1EarliestMs < t.team0EarliestMs)) return 1;
  return null;
}
