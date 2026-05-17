import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  MATCH_MODES, MATCH_PRIVACY, MATCH_ROUND_SECONDS, isMatchExpired,
} from "@/lib/match";

const CreateBody = z.object({
  mode: z.enum(MATCH_MODES),
  privacy: z.enum(MATCH_PRIVACY),
  difficulty: z.enum(["easy", "normal", "hard", "hardcore"]),
  language: z.enum(["javascript", "python", "typescript", "cpp", "csharp", "ruby"]),
  roundSeconds: z.union([z.literal(30), z.literal(60), z.literal(120)]).refine(
    (v) => (MATCH_ROUND_SECONDS as readonly number[]).includes(v),
  ),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      hostId: session.user.id,
      mode: parsed.data.mode,
      privacy: parsed.data.privacy,
      difficulty: parsed.data.difficulty,
      language: parsed.data.language,
      roundSeconds: parsed.data.roundSeconds,
      status: "ready",
      participants: {
        create: { userId: session.user.id, team: 0 },
      },
    },
  });

  return NextResponse.json({ id: match.id });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const languageFilter = url.searchParams.get("language");

  const where: Record<string, unknown> = { privacy: "public" };
  if (statusFilter === "ready" || statusFilter === "in_progress") {
    where.status = statusFilter;
  } else {
    where.status = { in: ["ready", "in_progress"] };
  }
  if (languageFilter) where.language = languageFilter;

  const rows = await prisma.match.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, handle: true, image: true } },
        },
      },
    },
  });

  // Lazy auto-cancel of stale matches.
  const live = rows.filter((m) => !isMatchExpired(m));
  const stale = rows.filter((m) => isMatchExpired(m)).map((m) => m.id);
  if (stale.length > 0) {
    void prisma.match.updateMany({
      where: { id: { in: stale } },
      data: { status: "cancelled" },
    });
  }

  return NextResponse.json({ matches: live });
}
