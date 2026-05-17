import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEquippedForUser } from "@/lib/cosmetics";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ role: null, frameSrc: null });
  const [user, equipped] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
    getEquippedForUser(session.user.id),
  ]);
  return NextResponse.json({
    role: user?.role ?? "user",
    frameSrc: equipped.frame?.assetUrl ?? null,
  });
}
