import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuthNav from "@/components/AuthNav";
import PointsBadge from "@/components/PointsBadge";
import CosmeticTile from "@/components/shop/CosmeticTile";
import type { CosmeticCategory, Rarity } from "@/lib/cosmetics";

export const metadata = { title: "Shop — Bugrush" };

const SECTIONS: Array<{ id: CosmeticCategory; title: string }> = [
  { id: "frame",       title: "FRAMES" },
  { id: "title",       title: "TITLES" },
  { id: "name_effect", title: "NAME EFFECTS" },
];

export default async function ShopPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const [cosmetics, me, owned, equipped] = await Promise.all([
    prisma.cosmetic.findMany({
      where: { enabled: true },
      orderBy: [{ category: "asc" }, { priceCoins: "asc" }],
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, handle: true, points: true },
        })
      : Promise.resolve(null),
    userId
      ? prisma.userCosmetic.findMany({
          where: { userId },
          select: { cosmeticId: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.equippedCosmetic.findMany({
          where: { userId, cosmeticId: { not: null } },
          select: { category: true, cosmeticId: true },
        })
      : Promise.resolve([]),
  ]);

  const previewName = me?.name ?? me?.handle ?? "username";
  const ownedIds = new Set(owned.map((o) => o.cosmeticId));
  const equippedIds = new Set(
    equipped.map((e) => e.cosmeticId).filter(Boolean) as string[],
  );

  return (
    <div className="min-h-screen text-zinc-100">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/home"
            className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition"
          >
            ← HOME
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">SHOP</div>
          <div className="flex items-center gap-5 text-xs font-pixel">
            {me && <PointsBadge value={me.points} />}
            <AuthNav />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {SECTIONS.map((s) => {
          const items = cosmetics.filter((c) => c.category === s.id);
          return (
            <section key={s.id}>
              <div className="font-mono text-xs text-indigo-400 mb-3">{`// ${s.title.toLowerCase()}`}</div>
              <h2 className="font-pixel text-2xl sm:text-3xl mb-6">{s.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((c) => (
                  <CosmeticTile
                    key={c.id}
                    loggedIn={!!userId}
                    previewName={previewName}
                    cosmetic={{
                      id: c.id,
                      category: c.category as CosmeticCategory,
                      name: c.name,
                      description: c.description,
                      rarity: c.rarity as Rarity,
                      priceCoins: c.priceCoins,
                      assetUrl: c.assetUrl,
                      cssClass: c.cssClass,
                      textValue: c.textValue,
                    }}
                    owned={ownedIds.has(c.id)}
                    equipped={equippedIds.has(c.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
