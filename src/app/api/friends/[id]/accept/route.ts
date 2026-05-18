import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;
  const { id } = await ctx.params;

  const row = await prisma.friendship.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.toUserId !== me) return NextResponse.json({ error: "not your request" }, { status: 403 });
  if (row.status === "accepted") return NextResponse.json({ ok: true });

  await prisma.friendship.update({ where: { id }, data: { status: "accepted" } });

  const meRow = await prisma.user.findUnique({
    where: { id: me },
    select: { handle: true, name: true },
  });
  await publish(`user:${row.fromUserId}`, {
    type: "friend-request-accepted",
    id,
    byHandle: meRow?.handle ?? null,
    byName: meRow?.name ?? null,
  });
  return NextResponse.json({ ok: true });
}
