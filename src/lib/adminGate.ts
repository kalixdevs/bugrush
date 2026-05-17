import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AdminUser = {
  id: string;
  email: string;
};

export async function requireAdmin(): Promise<AdminUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (user?.role !== "admin") return null;
  return { id: session.user.id, email: user.email };
}
