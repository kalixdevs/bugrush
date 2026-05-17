import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const where = q
    ? {
        OR: [
          { handle: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, handle: true, name: true, email: true,
      role: true, points: true, rankPoints: true, createdAt: true,
    },
  });
  return NextResponse.json({ users });
}
