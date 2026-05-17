import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";

const Body = z.object({ body: z.string().min(1).max(280) });

const rateLimit = new Map<string, number>();
const COOLDOWN_MS = 10_000;

const BANNED = ["slur1", "slur2"]; // intentionally minimal; expand later

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const last = rateLimit.get(session.user.id) ?? 0;
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "slow down", retryInMs: COOLDOWN_MS - (now - last) },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const text = parsed.data.body.trim();
  if (text.length === 0) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }
  const lower = text.toLowerCase();
  if (BANNED.some((b) => lower.includes(b))) {
    return NextResponse.json({ error: "blocked" }, { status: 400 });
  }

  rateLimit.set(session.user.id, now);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, handle: true, image: true },
  });

  const row = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      channel: "lfm",
      kind: "text",
      body: text,
    },
  });

  const payload = {
    kind: "message" as const,
    id: row.id,
    userId: session.user.id,
    name: user?.name ?? user?.handle ?? "anon",
    handle: user?.handle ?? null,
    image: user?.image ?? null,
    chatKind: "text",
    body: text,
    createdAt: row.createdAt.toISOString(),
  };

  publish("lfm", payload);

  return NextResponse.json({ message: payload });
}
