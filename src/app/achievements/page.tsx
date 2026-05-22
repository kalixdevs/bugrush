import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BADGES, CATEGORY_LABELS, type BadgeCategory } from "@/lib/badges";
import BadgeIcon from "@/components/BadgeIcon";
import PageHeader from "@/components/PageHeader";
import ShowcaseControls from "@/components/profile/ShowcaseControls";

export const metadata = { title: "Achievements — Bugrush" };

const CATEGORIES: BadgeCategory[] = ["major", "content", "special", "event"];

export default async function AchievementsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const [achievements, me] = await Promise.all([
    userId
      ? prisma.achievement.findMany({
          where: { userId },
          select: { badgeId: true, unlockedAt: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { showcaseBadgeId: true },
        })
      : Promise.resolve(null),
  ]);

  const earned = new Map(achievements.map((a) => [a.badgeId, a.unlockedAt]));
  const showcaseBadgeId = me?.showcaseBadgeId ?? null;
  const total = BADGES.length;
  const earnedCount = earned.size;
  const pct = total === 0 ? 0 : Math.round((earnedCount / total) * 100);

  const subtitle = userId
    ? `${earnedCount} / ${total} unlocked`
    : `${total} badges to chase`;

  return (
    <div className="text-zinc-100">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <PageHeader eyebrow="// achievements" title="ACHIEVEMENTS" subtitle={subtitle} />

        <div className="border-2 border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between font-pixel text-[10px] mb-2">
            <span className="text-zinc-400">PROGRESS</span>
            <span className="text-amber-300 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {CATEGORIES.map((cat) => {
          const badges = BADGES.filter((b) => b.category === cat);
          if (badges.length === 0) return null;
          const catEarned = badges.filter((b) => earned.has(b.id)).length;
          return (
            <section key={cat} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h2 className="font-pixel text-xs text-indigo-400">{CATEGORY_LABELS[cat]}</h2>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {catEarned}/{badges.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badges.map((b) => {
                  const unlockedAt = earned.get(b.id) ?? null;
                  const owned = unlockedAt != null;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-4 border-2 p-4 ${
                        owned ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950/60"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <BadgeIcon badge={b} owned={owned} size={52} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-pixel text-[11px] ${owned ? "text-zinc-100" : "text-zinc-500"}`}>
                          {b.name}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 leading-snug">{b.desc}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {owned ? (
                            <span className="font-pixel text-[9px] text-emerald-300">
                              UNLOCKED · {unlockedAt.toISOString().slice(0, 10)}
                            </span>
                          ) : (
                            <span className="font-pixel text-[9px] text-zinc-600">LOCKED</span>
                          )}
                          {userId && owned && (
                            <ShowcaseControls
                              badgeId={b.id}
                              isShowcased={showcaseBadgeId === b.id}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
