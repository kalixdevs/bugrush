import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEquippedForUsers } from "@/lib/cosmetics";

export async function GET() {
  const rows = await prisma.chatMessage.findMany({
    where: { channel: "lfm" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      user: { select: { name: true, handle: true, image: true, role: true, showcaseBadgeId: true } },
    },
  });

  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const equippedMap = await getEquippedForUsers(userIds);

  const messages = rows.reverse().map((r) => {
    const eq = equippedMap.get(r.userId);
    return {
      kind: "message" as const,
      id: r.id,
      userId: r.userId,
      name: r.user.name ?? r.user.handle ?? "anon",
      handle: r.user.handle ?? null,
      image: r.user.image ?? null,
      senderRole: r.user.role ?? "user",
      senderFrame: eq?.frame?.assetUrl ?? null,
      senderTitle: eq?.title?.textValue ?? null,
      senderNameEffect: eq?.nameEffect?.cssClass ?? null,
      senderShowcaseBadgeId: r.user.showcaseBadgeId ?? null,
      chatKind: r.kind,
      body: r.body,
      meta: r.meta,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ messages });
}
