import { prisma } from "@/lib/db";
import CodeAdminPanel from "@/components/admin/CodeAdminPanel";

export const metadata = { title: "Admin · Codes — Bugrush" };

export default async function AdminCodesPage() {
  const [codes, cosmetics] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.cosmetic.findMany({
      where: { enabled: true },
      select: { id: true, name: true, rarity: true },
      orderBy: [{ category: "asc" }, { rarity: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// promo codes"}</div>
        <h1 className="font-pixel text-3xl mt-2">PROMO CODES</h1>
      </div>
      <CodeAdminPanel
        initialCodes={codes.map((c) => ({
          code: c.code,
          rewardJson: (c.rewardJson as { points?: number; cosmeticIds?: string[] }) ?? {},
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          createdAt: c.createdAt.toISOString(),
        }))}
        cosmetics={cosmetics}
      />
    </div>
  );
}
