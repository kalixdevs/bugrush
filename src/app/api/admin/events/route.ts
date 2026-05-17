import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  pointsMultiplier: z.number().min(0).max(10),
  rankPointsMultiplier: z.number().min(0).max(10),
  exclusiveDrops: z.array(z.string()).default([]),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }
  const event = await prisma.event.create({
    data: {
      name: parsed.data.name,
      startsAt,
      endsAt,
      pointsMultiplier: parsed.data.pointsMultiplier,
      rankPointsMultiplier: parsed.data.rankPointsMultiplier,
      exclusiveDrops: parsed.data.exclusiveDrops,
    },
  });
  return NextResponse.json({ event });
}
