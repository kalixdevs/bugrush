import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rows = await prisma.chatMessage.findMany({
    where: { channel: "lfm" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      user: { select: { name: true, handle: true, image: true, role: true } },
    },
  });

  const messages = rows.reverse().map((r) => ({
    kind: "message" as const,
    id: r.id,
    userId: r.userId,
    name: r.user.name ?? r.user.handle ?? "anon",
    handle: r.user.handle ?? null,
    image: r.user.image ?? null,
    senderRole: r.user.role ?? "user",
    chatKind: r.kind,
    body: r.body,
    meta: r.meta,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ messages });
}
