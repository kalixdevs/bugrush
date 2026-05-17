export type BadgeTone = "emerald" | "fuchsia" | "amber" | "sky";
export type BadgeCategory = "major" | "content" | "special" | "event";

// Badge art comes from public/badges/sheet.png — a 6-column × 3-row grid.
// Each badge points at one (col, row) cell via `sprite`.
// Locked badges always fall back to the letter glyph.
export type Badge = {
  id: string;
  name: string;
  desc: string;
  letter: string;
  tone: BadgeTone;
  category: BadgeCategory;
  checkable: boolean;
  iconUrl?: string;
  sprite?: { col: number; row: number };
};

export const BADGE_SHEET = {
  src: "/badges/sheet.png",
  cols: 6,
  rows: 3,
} as const;

export const BADGES: Badge[] = [
  // MAJOR — run/rank milestones
  { id: "first-run",           name: "First Run",         desc: "Complete your first round.",          letter: "1",  tone: "emerald", category: "major",   checkable: true },
  { id: "bugs-50",             name: "Bug Hunter",        desc: "Squash 50 bugs.",                       letter: "50", tone: "emerald", category: "major",   checkable: true },
  { id: "bug-hunter-1000",     name: "Exterminator",      desc: "Squash 1,000 bugs.",                    letter: "1K", tone: "emerald", category: "major",   checkable: true },
  { id: "climbing-the-ladder", name: "Climbing",          desc: "Reach Hacker rank.",                    letter: "↑",  tone: "emerald", category: "major",   checkable: true },
  { id: "one-above-everyone",  name: "One Above",         desc: "Reach the terminal rank.",              letter: "★",  tone: "amber",   category: "major",   checkable: true },

  // CONTENT — gameplay variety
  { id: "first-solve",         name: "First Blood",       desc: "Solve your first bug.",                 letter: "B",  tone: "emerald", category: "content", checkable: true },
  { id: "polyglot",            name: "Polyglot",          desc: "Solve in 3+ languages.",                letter: "P",  tone: "sky",     category: "content", checkable: true },
  { id: "hc-first",            name: "Iron Stomach",      desc: "Win a hardcore round.",                 letter: "H",  tone: "fuchsia", category: "content", checkable: true },
  { id: "hc-ten",              name: "Untouchable",       desc: "Win 10 hardcore rounds.",               letter: "X",  tone: "fuchsia", category: "content", checkable: true },
  { id: "score-1k",            name: "Four Digits",       desc: "Single-run score ≥ 1,000.",             letter: "1K", tone: "emerald", category: "content", checkable: true },

  // SPECIAL — streaks / skill
  { id: "streak-7",            name: "Devotee",           desc: "7-day daily streak.",                   letter: "7",  tone: "amber",   category: "special", checkable: true },
  { id: "streak-30",           name: "Obsessed",          desc: "30-day daily streak.",                  letter: "30", tone: "amber",   category: "special", checkable: true },
  { id: "lightning-fingers",   name: "Lightning Fingers", desc: "Fix a bug in under 3 seconds.",         letter: "⚡", tone: "amber",   category: "special", checkable: true },
  { id: "frame-perfect",       name: "Frame Perfect",     desc: "Correct fix with <1s remaining.",       letter: "F",  tone: "fuchsia", category: "special", checkable: true },

  // EVENT — daily / pvp / future
  { id: "daily-first",         name: "Day One",           desc: "Solve your first daily.",               letter: "D",  tone: "amber",   category: "event",   checkable: true },
  { id: "race-condition",      name: "Race Condition",    desc: "Win a PvP duel by <1s.",                letter: "R",  tone: "fuchsia", category: "event",   checkable: true },
  { id: "undefeated",          name: "Undefeated",        desc: "10 ranked PvP wins in a row.",          letter: "U",  tone: "fuchsia", category: "event",   checkable: true },
];

export const TONE_CLASSES: Record<BadgeTone, { bg: string; text: string; ring: string }> = {
  emerald: { bg: "bg-indigo-500", text: "text-zinc-950", ring: "border-indigo-500" },
  fuchsia: { bg: "bg-fuchsia-500", text: "text-zinc-950", ring: "border-fuchsia-500" },
  amber:   { bg: "bg-amber-400",   text: "text-zinc-950", ring: "border-amber-400" },
  sky:     { bg: "bg-sky-500",     text: "text-zinc-950", ring: "border-sky-500" },
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  major:   "MAJOR ACHIEVEMENT",
  content: "CONTENTS ACHIEVEMENT",
  special: "SPECIAL ACHIEVEMENT",
  event:   "EVENT ACHIEVEMENT",
};

export const CATEGORY_TONES: Record<BadgeCategory, BadgeTone> = {
  major:   "amber",
  content: "emerald",
  special: "sky",
  event:   "fuchsia",
};

export function findBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
