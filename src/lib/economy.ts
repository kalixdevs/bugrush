import { prisma } from "./db";

export type Kind = "points" | "rankPoints";

export async function credit(
  userId: string,
  kind: Kind,
  amount: number,
  reason: string,
  refId?: string,
): Promise<void> {
  if (amount === 0) return;
  await prisma.$transaction([
    prisma.transaction.create({
      data: { userId, kind, amount, reason, refId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { [kind]: { increment: amount } },
    }),
  ]);
}

export async function debit(
  userId: string,
  kind: Kind,
  amount: number,
  reason: string,
  refId?: string,
): Promise<boolean> {
  if (amount <= 0) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { [kind]: true },
  });
  const current = (user as Record<string, number> | null)?.[kind] ?? 0;
  if (current < amount) return false;

  await prisma.$transaction([
    prisma.transaction.create({
      data: { userId, kind, amount: -amount, reason, refId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { [kind]: { decrement: amount } },
    }),
  ]);
  return true;
}
