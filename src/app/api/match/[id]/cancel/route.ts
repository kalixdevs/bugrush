import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: matchId } = await ctx.params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (match.hostId !== session.user.id) {
    return NextResponse.json({ error: "not host" }, { status: 403 });
  }
  if (match.status !== "ready") {
    return NextResponse.json({ error: "cannot cancel" }, { status: 409 });
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "cancelled" },
  });
  await publish(`match:${matchId}`, { type: "cancelled" });
  return NextResponse.json({ ok: true });
}
