import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { rateLimit } from "@/lib/rateLimit";
import { otherSide } from "@/lib/dm";

export async function POST(_req: Request, ctx: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  // Cheap throttle so a fast typer can't spam.
  const rl = await rateLimit(`dm-typing:${me}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true }); // silently drop

  const thread = await prisma.dmThread.findUnique({
    where: { id: threadId },
    select: { userAId: true, userBId: true },
  });
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (thread.userAId !== me && thread.userBId !== me) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const otherId = otherSide(thread, me);

  await publish(`user:${otherId}`, {
    type: "dm-typing",
    threadId,
    senderId: me,
  });

  return NextResponse.json({ ok: true });
}
