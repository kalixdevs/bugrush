import type { PrismaClient } from "@prisma/client";
import { slugify } from "./slug";

const RESERVED = new Set([
  "home", "play", "daily", "profile", "leaderboard",
  "login", "signup", "u", "api", "admin", "settings",
  "about", "help", "privacy", "terms",
]);

export function normalizeHandle(raw: string): string {
  return slugify(raw).slice(0, 20);
}

export function isValidHandle(h: string): boolean {
  if (h.length < 3 || h.length > 20) return false;
  if (RESERVED.has(h)) return false;
  return /^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])?$/.test(h);
}

export function describeHandleError(h: string): string | null {
  if (h.length < 3) return "Handle must be at least 3 characters.";
  if (h.length > 20) return "Handle must be at most 20 characters.";
  if (RESERVED.has(h)) return "That handle is reserved.";
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])?$/.test(h)) {
    return "Use lowercase letters, digits, dashes, underscores.";
  }
  return null;
}

export async function generateUniqueHandle(
  seed: string,
  prisma: PrismaClient,
): Promise<string> {
  let base = normalizeHandle(seed);
  if (base.length < 3) {
    base = `player-${Math.random().toString(36).slice(2, 8)}`;
  }
  if (RESERVED.has(base)) {
    base = `${base}-1`;
  }

  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!existing) return candidate;
    const suffixStr = String(suffix);
    const cut = Math.max(1, 20 - suffixStr.length - 1);
    candidate = `${base.slice(0, cut)}-${suffixStr}`;
    suffix++;
    if (suffix > 9999) {
      return `player-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
}
