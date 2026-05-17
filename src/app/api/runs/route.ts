import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { credit } from "@/lib/economy";
import { coinsFromScore, POINTS_FOR_RUN } from "@/lib/ranks";
import { checkAndUnlock } from "@/lib/achievementCheck";
import { applyEventMultiplier, getActiveEvent } from "@/lib/events";

const RunSchema = z.object({
  score: z.number().int().nonnegative().max(1_000_000),
  solves: z.number().int().nonnegative().max(10_000),
  difficulty: z.enum(["easy", "normal", "hard", "hardcore"]),
  languages: z.array(z.enum(["javascript", "python", "typescript", "cpp", "csharp", "ruby"])).min(1),
  roundSeconds: z.number().int().positive().nullable(),
  solveCap: z.number().int().positive().nullable(),
  endReason: z.enum(["time", "manual", "cap", "hardcore-fail"]),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = RunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const run = await prisma.run.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  const event = await getActiveEvent();
  const coins = await applyEventMultiplier("points", coinsFromScore(parsed.data.score), event);
  const rp = await applyEventMultiplier("rankPoints", POINTS_FOR_RUN, event);
  await credit(session.user.id, "points", coins, "run", run.id);
  await credit(session.user.id, "rankPoints", rp, "run", run.id);

  const newBadges = await checkAndUnlock(session.user.id);

  return NextResponse.json({
    id: run.id,
    coinsAwarded: coins,
    rankPointsAwarded: rp,
    newBadges,
  });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const top = await prisma.run.findFirst({
    where: { userId: session.user.id },
    orderBy: { score: "desc" },
    select: { score: true },
  });

  return NextResponse.json({ personalBest: top?.score ?? null });
}
