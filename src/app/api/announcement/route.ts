import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: "chat.announcement" } });
  return NextResponse.json({ value: row?.value ?? "" });
}
