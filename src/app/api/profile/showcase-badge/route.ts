import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findBadge } from "@/lib/badges";

const Body = z.object({ badgeId: z.string().nullable() });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (parsed.data.badgeId) {
    const badge = findBadge(parsed.data.badgeId);
    if (!badge) {
      return NextResponse.json({ error: "unknown badge" }, { status: 400 });
    }
    const earned = await prisma.achievement.findUnique({
      where: {
        userId_badgeId: {
          userId: session.user.id,
          badgeId: parsed.data.badgeId,
        },
      },
    });
    if (!earned) {
      return NextResponse.json({ error: "not unlocked" }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { showcaseBadgeId: parsed.data.badgeId },
  });

  return NextResponse.json({ ok: true });
}
