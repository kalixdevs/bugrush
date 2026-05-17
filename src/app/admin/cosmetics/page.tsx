import { prisma } from "@/lib/db";
import CosmeticAdminPanel from "@/components/admin/CosmeticAdminPanel";

export const metadata = { title: "Admin · Cosmetics — Bugrush" };

export default async function AdminCosmeticsPage() {
  const cosmetics = await prisma.cosmetic.findMany({
    orderBy: [{ category: "asc" }, { rarity: "asc" }, { name: "asc" }],
    select: {
      id: true, category: true, name: true, description: true,
      rarity: true, priceCoins: true, enabled: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// cosmetics catalog"}</div>
        <h1 className="font-pixel text-3xl mt-2">COSMETICS</h1>
        <p className="text-zinc-500 text-xs font-mono mt-2">New cosmetics still ship via prisma/seed-cosmetics.ts. This panel edits existing rows.</p>
      </div>
      <CosmeticAdminPanel cosmetics={cosmetics} />
    </div>
  );
}
