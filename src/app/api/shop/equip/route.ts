import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  category: z.enum(["frame", "title", "name_effect"]),
  cosmeticId: z.string().min(1).max(80).nullable(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (parsed.data.cosmeticId) {
    const owned = await prisma.userCosmetic.findUnique({
      where: {
        userId_cosmeticId: {
          userId: session.user.id,
          cosmeticId: parsed.data.cosmeticId,
        },
      },
      include: { cosmetic: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not owned" }, { status: 403 });
    }
    if (owned.cosmetic.category !== parsed.data.category) {
      return NextResponse.json({ error: "wrong category" }, { status: 400 });
    }
  }

  await prisma.equippedCosmetic.upsert({
    where: {
      userId_category: { userId: session.user.id, category: parsed.data.category },
    },
    create: {
      userId: session.user.id,
      category: parsed.data.category,
      cosmeticId: parsed.data.cosmeticId,
    },
    update: { cosmeticId: parsed.data.cosmeticId },
  });

  return NextResponse.json({ ok: true });
}
