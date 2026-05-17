import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { describeHandleError, normalizeHandle } from "@/lib/handle";
import { rateLimit, rlKey } from "@/lib/rateLimit";

const BodySchema = z
  .object({
    handle: z.string().min(1).max(40).optional(),
    name: z.string().min(1).max(60).optional(),
  })
  .refine((d) => d.handle !== undefined || d.name !== undefined, {
    message: "nothing to update",
  });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(rlKey("profile_edit", session.user.id), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryInMs: rl.retryInMs },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const data: { handle?: string; name?: string } = {};

  if (parsed.data.handle !== undefined) {
    const normalized = normalizeHandle(parsed.data.handle);
    const err = describeHandleError(normalized);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
    data.handle = normalized;
  }

  if (parsed.data.name !== undefined) {
    const trimmed = parsed.data.name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      return NextResponse.json(
        { error: "Display name must be 1-40 characters." },
        { status: 400 },
      );
    }
    data.name = trimmed;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { handle: true, name: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Handle is taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
