import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user: {
    id: string;
    handle: string | null;
    name: string | null;
    image: string | null;
    lastSeenAt: Date | null;
  };
};

function shape(row: Row) {
  return {
    id: row.id,
    userId: row.user.id,
    handle: row.user.handle,
    name: row.user.name,
    image: row.user.image,
    lastSeenAt: row.user.lastSeenAt ? row.user.lastSeenAt.toISOString() : null,
  };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const [out, inc] = await Promise.all([
    prisma.friendship.findMany({
      where: { fromUserId: me },
      orderBy: { updatedAt: "desc" },
      include: {
        toUser: { select: { id: true, handle: true, name: true, image: true, lastSeenAt: true } },
      },
    }),
    prisma.friendship.findMany({
      where: { toUserId: me },
      orderBy: { updatedAt: "desc" },
      include: {
        fromUser: { select: { id: true, handle: true, name: true, image: true, lastSeenAt: true } },
      },
    }),
  ]);

  const friends = [
    ...out.filter((f) => f.status === "accepted").map((f) => shape({ id: f.id, user: f.toUser })),
    ...inc.filter((f) => f.status === "accepted").map((f) => shape({ id: f.id, user: f.fromUser })),
  ];
  const outgoing = out
    .filter((f) => f.status === "pending")
    .map((f) => shape({ id: f.id, user: f.toUser }));
  const incoming = inc
    .filter((f) => f.status === "pending")
    .map((f) => shape({ id: f.id, user: f.fromUser }));

  return NextResponse.json({ friends, outgoing, incoming });
}
