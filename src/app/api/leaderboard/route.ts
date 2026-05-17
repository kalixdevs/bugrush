import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DIFFICULTIES = new Set(["easy", "normal", "hard", "hardcore"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const diff = url.searchParams.get("difficulty");
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50), 100);

  const where = diff && DIFFICULTIES.has(diff) ? { difficulty: diff } : {};

  const rows = await prisma.run.findMany({
    where,
    orderBy: { score: "desc" },
    take: limit,
    select: {
      id: true,
      score: true,
      solves: true,
      difficulty: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const entries = rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    score: r.score,
    solves: r.solves,
    difficulty: r.difficulty,
    createdAt: r.createdAt,
    name: r.user.name ?? r.user.email.split("@")[0],
  }));

  return NextResponse.json({ entries });
}
