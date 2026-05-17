export const RANK_TIERS = [
  "intern-1", "intern-2", "intern-3",
  "indie-1",  "indie-2",  "indie-3",
  "senior-1", "senior-2", "senior-3",
  "legend-1", "legend-2", "legend-3",
  "hacker-1", "hacker-2", "hacker-3",
  "one-above-everyone",
] as const;

export type RankTier = (typeof RANK_TIERS)[number];

const POINTS_PER_TIER = 100;

export type RankInfo = {
  tier: RankTier;
  label: string;
  index: number;
  progress: number;
  pointsToNext: number;
  isMax: boolean;
};

function prettify(tier: string): string {
  return tier
    .split("-")
    .map((p) => (p === "one" || p === "above" || p === "everyone" ? p : p))
    .join(" ")
    .toUpperCase();
}

export function rankFor(rp: number): RankInfo {
  const safe = Math.max(0, rp | 0);
  const idx = Math.min(Math.floor(safe / POINTS_PER_TIER), RANK_TIERS.length - 1);
  const isMax = idx === RANK_TIERS.length - 1;
  return {
    tier: RANK_TIERS[idx],
    label: prettify(RANK_TIERS[idx]),
    index: idx,
    progress: isMax ? POINTS_PER_TIER : safe % POINTS_PER_TIER,
    pointsToNext: isMax ? 0 : POINTS_PER_TIER - (safe % POINTS_PER_TIER),
    isMax,
  };
}

export const POINTS_FOR_RUN = 15;
export const POINTS_FOR_PVP_WIN = 20;
export const POINTS_FOR_PVP_LOSS = 5;

export function coinsFromScore(score: number): number {
  return Math.max(5, Math.floor(score / 10));
}
