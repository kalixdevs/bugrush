import { prisma } from "./db";

const ONLINE_WINDOW_MS = 90_000;

export function isOnline(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const ts = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (!isFinite(ts)) return false;
  return Date.now() - ts < ONLINE_WINDOW_MS;
}

/** Fire-and-forget; safe to call on every request handler. */
export async function bumpLastSeen(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    });
  } catch { /* swallow */ }
}
