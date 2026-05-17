import { challenges, type Challenge } from "./challenges";

export function todayKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAILY_POOL: Challenge[] = challenges
  .filter((c) => c.difficulty === "normal")
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id));

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function getDailyChallenge(dayKey: string = todayKey()): Challenge {
  if (DAILY_POOL.length === 0) {
    throw new Error("daily pool is empty");
  }
  const idx = fnv1a(dayKey) % DAILY_POOL.length;
  return DAILY_POOL[idx];
}

export function scoreFor(success: boolean, timeMs: number): number {
  if (!success) return 0;
  return Math.max(100, Math.min(1000, 1000 - Math.floor(timeMs / 60)));
}

export const DAILY_DURATION_MS = 60_000;
