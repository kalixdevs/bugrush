import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";

const Body = z.object({ role: z.enum(["user", "admin"]) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  if (id === admin.id && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "cannot demote yourself" }, { status: 400 });
  }

  // Block one admin from demoting another admin. Only self-demotion is allowed.
  if (parsed.data.role === "user") {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (target.role === "admin" && id !== admin.id) {
      console.error(`[sec] admin ${admin.id} attempted to demote admin ${id}`);
      return NextResponse.json({ error: "cannot demote another admin" }, { status: 403 });
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    console.error("[sec] role update failed", e);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
