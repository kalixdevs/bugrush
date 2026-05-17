import { prisma } from "@/lib/db";
import { getActiveEvent } from "@/lib/events";

export const metadata = { title: "Admin · Dashboard — Bugrush" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-5">
      <div className="font-pixel text-[10px] text-zinc-500 tracking-widest mb-2">{label}</div>
      <div className="font-pixel text-2xl text-zinc-100">{value}</div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [activeEvent, userCount, codeCount, enabledCosmetics, recentGrants] = await Promise.all([
    getActiveEvent(),
    prisma.user.count(),
    prisma.promoCode.count(),
    prisma.cosmetic.count({ where: { enabled: true } }),
    prisma.transaction.findMany({
      where: { reason: { startsWith: "admin_" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { handle: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// dashboard"}</div>
        <h1 className="font-pixel text-3xl mt-2">OVERVIEW</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="USERS" value={userCount} />
        <Stat label="PROMO CODES" value={codeCount} />
        <Stat label="COSMETICS" value={enabledCosmetics} />
        <Stat label="ACTIVE EVENT" value={activeEvent ? activeEvent.name : "—"} />
      </div>

      <section>
        <h2 className="font-pixel text-lg mb-3">RECENT ADMIN ACTIONS</h2>
        {recentGrants.length === 0 ? (
          <div className="text-zinc-500 text-sm font-mono">No admin actions recorded yet.</div>
        ) : (
          <div className="border-2 border-zinc-800 bg-zinc-900 divide-y-2 divide-zinc-800">
            {recentGrants.map((t) => (
              <div key={t.id} className="px-4 py-2 flex items-center justify-between text-sm font-mono">
                <div className="text-zinc-300">
                  {t.user.handle ?? t.user.name ?? "user"}{" "}
                  <span className="text-zinc-500">·</span>{" "}
                  <span className={t.amount > 0 ? "text-emerald-400" : "text-fuchsia-400"}>
                    {t.amount > 0 ? "+" : ""}{t.amount} {t.kind}
                  </span>{" "}
                  <span className="text-zinc-500">({t.reason})</span>
                </div>
                <div className="text-zinc-500 text-xs">{t.createdAt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
