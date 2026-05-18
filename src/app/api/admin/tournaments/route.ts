import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";
import { TOURNAMENT_SIZES } from "@/lib/bracket";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  size: z.union([z.literal(4), z.literal(8), z.literal(16)]).refine(
    (v) => (TOURNAMENT_SIZES as readonly number[]).includes(v),
  ),
  difficulty: z.enum(["easy", "normal", "hard", "hardcore"]),
  language: z.enum(["javascript", "python", "typescript", "cpp", "csharp", "ruby"]),
  roundSeconds: z.union([z.literal(30), z.literal(60), z.literal(120)]),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { slots: { include: { user: { select: { handle: true } } } } },
  });
  return NextResponse.json({ tournaments });
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
  const tournament = await prisma.tournament.create({
    data: {
      name: parsed.data.name,
      size: parsed.data.size,
      status: "draft",
      format: "single_elim",
      difficulty: parsed.data.difficulty,
      language: parsed.data.language,
      roundSeconds: parsed.data.roundSeconds,
      slots: {
        create: Array.from({ length: parsed.data.size }, (_, i) => ({ seed: i })),
      },
    },
  });
  return NextResponse.json({ tournament });
}
