import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  const viewerId = session?.user?.id ?? null;

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

  // Hide other players' submitted code from non-participants and from
  // each other (only the owner sees their own code).
  const sanitized = {
    ...match,
    participants: match.participants.map((p) => ({
      ...p,
      submittedCode: p.userId === viewerId ? p.submittedCode : null,
    })),
  };

  return NextResponse.json({ match: sanitized });
}
