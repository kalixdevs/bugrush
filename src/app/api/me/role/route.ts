import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEquippedForUser } from "@/lib/cosmetics";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ role: null, frameSrc: null, points: 0, loggedIn: false });
  }
  const [user, equipped] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, points: true },
    }),
    getEquippedForUser(session.user.id),
  ]);
  return NextResponse.json({
    loggedIn: true,
    role: user?.role ?? "user",
    points: user?.points ?? 0,
    frameSrc: equipped.frame?.assetUrl ?? null,
  });
}
