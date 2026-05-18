import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ matchId: null });
  const match = await prisma.match.findFirst({
    where: { hostId: session.user.id, status: "ready" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return NextResponse.json({ matchId: match?.id ?? null });
}
