import { prisma } from "@/lib/db";
import EventAdminPanel from "@/components/admin/EventAdminPanel";

export const metadata = { title: "Admin · Events — Bugrush" };

export default async function AdminEventsPage() {
  const [events, cosmetics] = await Promise.all([
    prisma.event.findMany({ orderBy: { startsAt: "desc" } }),
    prisma.cosmetic.findMany({
      where: { enabled: true },
      select: { id: true, name: true, rarity: true, category: true },
      orderBy: [{ category: "asc" }, { rarity: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// events"}</div>
        <h1 className="font-pixel text-3xl mt-2">EVENTS</h1>
      </div>
      <EventAdminPanel
        initialEvents={events.map((e) => ({
          id: e.id,
          name: e.name,
          startsAt: e.startsAt.toISOString(),
          endsAt: e.endsAt.toISOString(),
          pointsMultiplier: e.pointsMultiplier,
          rankPointsMultiplier: e.rankPointsMultiplier,
          exclusiveDrops: Array.isArray(e.exclusiveDrops)
            ? (e.exclusiveDrops as unknown[]).filter((x): x is string => typeof x === "string")
            : [],
        }))}
        cosmetics={cosmetics}
      />
    </div>
  );
}
