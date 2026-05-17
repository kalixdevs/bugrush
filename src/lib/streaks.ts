import { todayKey } from "./daily";

function shiftDay(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + deltaDays * 86_400_000;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function computeStreaks(
  dayKeys: string[],
  now: Date = new Date(),
): { current: number; longest: number } {
  if (dayKeys.length === 0) return { current: 0, longest: 0 };

  const set = new Set(dayKeys);
  const today = todayKey(now);
  const yesterday = shiftDay(today, -1);

  // Current streak: start at today (if present) or yesterday (grace day),
  // then walk backward.
  let current = 0;
  let cursor: string | null = null;
  if (set.has(today)) cursor = today;
  else if (set.has(yesterday)) cursor = yesterday;

  while (cursor && set.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  // Longest streak: sort ascending, scan for consecutive runs.
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    if (prev && shiftDay(prev, 1) === k) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = k;
  }

  return { current, longest };
}
