import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { areFriends, ensureThread } from "@/lib/dm";

const Body = z.object({ handle: z.string().min(1).max(64) });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { handle: parsed.data.handle.toLowerCase() },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.id === me) return NextResponse.json({ error: "self" }, { status: 400 });

  if (!(await areFriends(me, target.id))) {
    return NextResponse.json({ error: "not friends" }, { status: 403 });
  }

  const threadId = await ensureThread(me, target.id);
  return NextResponse.json({ threadId });
}
