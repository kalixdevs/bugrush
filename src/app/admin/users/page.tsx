import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGate";
import UserAdminPanel from "@/components/admin/UserAdminPanel";

export const metadata = { title: "Admin · Users — Devrace" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const [users, cosmetics] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, handle: true, name: true, email: true,
        role: true, points: true, rankPoints: true, createdAt: true,
      },
    }),
    prisma.cosmetic.findMany({
      where: { enabled: true },
      select: { id: true, name: true, rarity: true },
      orderBy: [{ category: "asc" }, { rarity: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// users"}</div>
        <h1 className="font-pixel text-3xl mt-2">USERS</h1>
      </div>
      <UserAdminPanel
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        cosmetics={cosmetics}
        selfId={admin!.id}
      />
    </div>
  );
}
