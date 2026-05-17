import { prisma } from "./db";

export type ActiveEvent = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  pointsMultiplier: number;
  rankPointsMultiplier: number;
  exclusiveDrops: string[];
};

export async function getActiveEvent(now: Date = new Date()): Promise<ActiveEvent | null> {
  const row = await prisma.event.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "desc" },
  });
  if (!row) return null;
  const drops = Array.isArray(row.exclusiveDrops)
    ? (row.exclusiveDrops as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: row.id,
    name: row.name,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    pointsMultiplier: row.pointsMultiplier,
    rankPointsMultiplier: row.rankPointsMultiplier,
    exclusiveDrops: drops,
  };
}

export async function applyEventMultiplier(
  kind: "points" | "rankPoints",
  base: number,
  event?: ActiveEvent | null,
): Promise<number> {
  const e = event === undefined ? await getActiveEvent() : event;
  if (!e) return base;
  const mult = kind === "points" ? e.pointsMultiplier : e.rankPointsMultiplier;
  return Math.round(base * mult);
}
