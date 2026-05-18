import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;
  const { id } = await ctx.params;

  const row = await prisma.friendship.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.fromUserId !== me && row.toUserId !== me) {
    return NextResponse.json({ error: "not yours" }, { status: 403 });
  }
  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
