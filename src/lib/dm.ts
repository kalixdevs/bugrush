import { prisma } from "./db";

export function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: a, toUserId: b },
        { fromUserId: b, toUserId: a },
      ],
    },
    select: { id: true },
  });
  return !!f;
}

export async function ensureThread(me: string, other: string): Promise<string> {
  const [userAId, userBId] = pairKey(me, other);
  const existing = await prisma.dmThread.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const row = await prisma.dmThread.create({
    data: { userAId, userBId },
    select: { id: true },
  });
  return row.id;
}

export function otherSide(thread: { userAId: string; userBId: string }, me: string): string {
  return thread.userAId === me ? thread.userBId : thread.userAId;
}

export function isSideA(thread: { userAId: string }, me: string): boolean {
  return thread.userAId === me;
}

/** Bump the calling user's lastReadAt to now. */
export async function bumpRead(threadId: string, me: string, thread: { userAId: string }): Promise<Date> {
  const now = new Date();
  const field = isSideA(thread, me) ? "lastReadAtA" : "lastReadAtB";
  await prisma.dmThread.update({
    where: { id: threadId },
    data: { [field]: now },
    select: { id: true },
  });
  return now;
}

export function myLastReadAt(thread: { userAId: string; lastReadAtA: Date | null; lastReadAtB: Date | null }, me: string): Date | null {
  return isSideA(thread, me) ? thread.lastReadAtA : thread.lastReadAtB;
}
