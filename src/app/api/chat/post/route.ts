import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/realtime";

const Body = z.object({ body: z.string().min(1).max(280) });

const rateLimit = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 10_000;

const BANNED = ["slur1", "slur2"]; // intentionally minimal; expand later

async function getCooldownMs(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "chat.slowMode" } });
  const secs = row ? Number(row.value) : NaN;
  if (!isFinite(secs) || secs < 0) return DEFAULT_COOLDOWN_MS;
  return secs * 1000;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const cooldownMs = await getCooldownMs();
  const last = rateLimit.get(session.user.id) ?? 0;
  if (cooldownMs > 0 && now - last < cooldownMs) {
    return NextResponse.json(
      { error: "slow down", retryInMs: cooldownMs - (now - last) },
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, handle: true, image: true, role: true, chatMutedUntil: true },
  });

  if (user?.chatMutedUntil && user.chatMutedUntil.getTime() > now) {
    return NextResponse.json(
      { error: "muted", until: user.chatMutedUntil.toISOString() },
      { status: 403 },
    );
  }

  rateLimit.set(session.user.id, now);

  // Detect a match link and attach metadata so clients render a chip.
  const matchIdMatch = text.match(/\/match\/([a-z0-9]{20,})/i);
  let meta: Record<string, unknown> | null = null;
  if (matchIdMatch) {
    const match = await prisma.match.findUnique({
      where: { id: matchIdMatch[1] },
      select: { id: true, mode: true, language: true, difficulty: true, status: true },
    });
    if (match && (match.status === "ready" || match.status === "in_progress")) {
      meta = {
        matchId: match.id,
        mode: match.mode,
        language: match.language,
        difficulty: match.difficulty,
        status: match.status,
      };
    }
  }

  const row = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      channel: "lfm",
      kind: "text",
      body: text,
      meta: meta === null ? undefined : (meta as never),
    },
  });

  const payload = {
    kind: "message" as const,
    id: row.id,
    userId: session.user.id,
    name: user?.name ?? user?.handle ?? "anon",
    handle: user?.handle ?? null,
    image: user?.image ?? null,
    senderRole: user?.role ?? "user",
    chatKind: "text",
    body: text,
    meta,
    createdAt: row.createdAt.toISOString(),
  };

  await publish("lfm", payload);

  return NextResponse.json({ message: payload });
}
