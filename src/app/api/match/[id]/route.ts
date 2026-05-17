import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, name: true, handle: true, image: true } },
        },
      },
    },
  });
  if (!match) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ match });
}
