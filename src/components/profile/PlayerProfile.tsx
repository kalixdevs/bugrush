import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeStreaks } from "@/lib/streaks";
import { BADGES, CATEGORY_LABELS, type BadgeCategory } from "@/lib/badges";
import BadgeIcon from "@/components/BadgeIcon";
import ShowcaseControls from "@/components/profile/ShowcaseControls";

const DIFFICULTIES = ["easy", "normal", "hard", "hardcore"] as const;

export type ProfileData = Awaited<ReturnType<typeof getProfileData>>;

export async function getProfileData(userId: string) {
  const [totals, bests, hardcore, recent, runLangs, dailyDays, achievements] = await Promise.all([
    prisma.run.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { solves: true },
      _max: { score: true },
    }),
    prisma.run.groupBy({
      by: ["difficulty"],
      where: { userId },
      _max: { score: true },
    }),
    prisma.run.groupBy({
      by: ["endReason"],
      where: { userId, difficulty: "hardcore" },
      _count: { _all: true },
    }),
    prisma.run.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        score: true,
        solves: true,
        difficulty: true,
        endReason: true,
        languages: true,
        roundSeconds: true,
        createdAt: true,
      },
    }),
    prisma.run.findMany({
      where: { userId },
      select: { languages: true },
    }),
    prisma.dailyAttempt.findMany({
      where: { userId },
      select: { dayKey: true },
    }),
    prisma.achievement.findMany({
      where: { userId },
      select: { badgeId: true },
    }),
  ]);

  const runCount = totals._count._all;
  const totalSolves = totals._sum.solves ?? 0;
  const bestScore = totals._max.score ?? 0;

  const bestByDiff: Record<string, number | null> = {
    easy: null, normal: null, hard: null, hardcore: null,
  };
  for (const b of bests) {
    if (b._max.score != null) bestByDiff[b.difficulty] = b._max.score;
  }

  const hardcoreTotal = hardcore.reduce((n, r) => n + r._count._all, 0);
  const hardcoreFails = hardcore.find((r) => r.endReason === "hardcore-fail")?._count._all ?? 0;
  const hardcoreSurvival =
    hardcoreTotal === 0
      ? null
      : Math.round(((hardcoreTotal - hardcoreFails) / hardcoreTotal) * 100);

  const languagesPlayed = Array.from(
    new Set(runLangs.flatMap((r) => r.languages)),
  ).sort();

  const { current: currentStreak, longest: longestStreak } = computeStreaks(
    dailyDays.map((d) => d.dayKey),
  );

  const earnedBadges = new Set(achievements.map((a) => a.badgeId));

  return {
    runCount,
    totalSolves,
    bestScore,
    bestByDiff,
    hardcoreSurvival,
    recent,
    languagesPlayed,
    currentStreak,
    longestStreak,
    earnedBadges,
  };
}

function endChip(reason: string) {
  switch (reason) {
    case "hardcore-fail":
      return { label: "KO", cls: "border-fuchsia-500 bg-fuchsia-500 text-zinc-950" };
    case "cap":
      return { label: "CAP", cls: "border-indigo-500 text-indigo-300 bg-zinc-950" };
    case "manual":
      return { label: "MANUAL", cls: "border-zinc-600 text-zinc-300 bg-zinc-950" };
    default:
      return { label: "TIME", cls: "border-amber-400 text-amber-300 bg-zinc-950" };
  }
}

type Props = {
  data: ProfileData;
  ownProfile: boolean;
  showcaseBadgeId?: string | null;
};

export default function PlayerProfile({ data, ownProfile, showcaseBadgeId }: Props) {
  const {
    runCount, totalSolves, bestScore, bestByDiff, hardcoreSurvival, recent,
    languagesPlayed, currentStreak, longestStreak, earnedBadges,
  } = data;
  const earned = earnedBadges ?? new Set<string>();

  const categories: BadgeCategory[] = ["major", "content", "special", "event"];
  const byCategory = categories.map((cat) => {
    const all = BADGES.filter((b) => b.category === cat);
    const owned = all.filter((b) => earned.has(b.id));
    return { cat, all, owned };
  });
  return (
    <>
      <section className="flex items-center flex-wrap gap-2">
        <span className="font-pixel text-[10px] text-zinc-500">LANGS</span>
        {languagesPlayed.length === 0 ? (
          <span className="font-pixel text-[10px] text-zinc-500">·  —</span>
        ) : (
          languagesPlayed.map((l) => (
            <span
              key={l}
              className="font-pixel text-[10px] px-2 py-1 border-2 border-zinc-700 bg-zinc-950 text-zinc-300 uppercase"
            >
              {l.slice(0, 2)}
            </span>
          ))
        )}
      </section>

      <section id="achievements" className="border-2 border-zinc-800 bg-zinc-900 p-6 scroll-mt-20 space-y-3">
        <div className="font-pixel text-xs text-indigo-400 mb-4">CURRENT ACHIEVEMENT STATUS</div>
        {byCategory.map(({ cat, all, owned }) => {
          const pct = all.length === 0 ? 0 : Math.round((owned.length / all.length) * 100);
          return (
            <a
              key={cat}
              href={`#cat-${cat}`}
              className="flex items-center gap-4 border-2 border-zinc-800 bg-zinc-950 px-4 py-3 hover:border-zinc-700 transition"
            >
              <div className="font-pixel text-[11px] text-zinc-200 w-48 shrink-0">{CATEGORY_LABELS[cat]}</div>
              <div className="flex-1 h-2 bg-zinc-800 border border-zinc-800 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="font-mono text-[11px] text-zinc-400 tabular-nums w-20 text-right">
                {pct}% / 100%
              </div>
            </a>
          );
        })}
      </section>

      {byCategory.map(({ cat, all }) => (
        <section key={cat} id={`cat-${cat}`} className="space-y-4 scroll-mt-20">
          <div className="font-pixel text-xs text-indigo-400">{CATEGORY_LABELS[cat]}</div>
          <div className="flex flex-wrap gap-6">
            {all.map((b) => {
              const owned = earned.has(b.id);
              return (
                <div key={b.id} className="flex flex-col items-center gap-2">
                  <BadgeIcon badge={b} owned={owned} size={72} withLabel />
                  {ownProfile && owned && (
                    <ShowcaseControls
                      badgeId={b.id}
                      isShowcased={showcaseBadgeId === b.id}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="RUNS" value={runCount.toString()} />
        <StatCard label="BUGS" value={totalSolves.toString()} />
        <StatCard label="BEST" value={bestScore.toString()} accent="emerald" />
        <StatCard
          label="STREAK"
          value={currentStreak.toString()}
          accent={currentStreak > 0 ? "emerald" : undefined}
        />
        <StatCard
          label="HC SURVIVAL"
          value={hardcoreSurvival == null ? "—" : `${hardcoreSurvival}%`}
          accent={hardcoreSurvival != null && hardcoreSurvival >= 50 ? "emerald" : "fuchsia"}
        />
      </section>

      <section className="border-2 border-zinc-800 bg-zinc-900 p-6">
        <div className="font-pixel text-xs text-indigo-400 mb-4">BESTS BY DIFFICULTY</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DIFFICULTIES.map((d) => {
            const score = bestByDiff[d];
            return (
              <div key={d} className="border-2 border-zinc-800 bg-zinc-950 px-3 py-3">
                <div className="font-pixel text-[10px] text-zinc-500 uppercase">{d}</div>
                <div className="text-2xl font-mono tabular-nums mt-2 text-zinc-100">
                  {score ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="font-pixel text-[10px] text-zinc-500 mt-4">
          LONGEST STREAK: <span className="text-zinc-300 tabular-nums">{longestStreak}</span> DAYS
        </div>
      </section>

      <section>
        <div className="font-mono text-xs text-indigo-400 mb-3">{"// recent runs"}</div>
        <h2 className="font-pixel text-lg mb-5">LAST 10</h2>
        {recent.length === 0 ? (
          <div className="border-2 border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="font-pixel text-sm text-zinc-400">NO RUNS YET</p>
            {ownProfile && (
              <p className="text-zinc-500 text-sm mt-2">
                <Link href="/play" className="text-indigo-400 hover:text-indigo-300">
                  Play your first round →
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="border-2 border-zinc-800 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 border-b-2 border-zinc-800">
                <tr className="font-pixel text-[10px] text-zinc-500">
                  <th className="text-left px-4 py-3">WHEN</th>
                  <th className="text-left px-4 py-3">DIFF</th>
                  <th className="text-left px-4 py-3">LANG</th>
                  <th className="text-left px-4 py-3">END</th>
                  <th className="text-right px-4 py-3">SOLVES</th>
                  <th className="text-right px-4 py-3">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => {
                  const chip = endChip(r.endReason);
                  return (
                    <tr key={r.id} className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950/60"}>
                      <td className="px-4 py-2.5 text-zinc-400 font-mono text-xs">
                        {r.createdAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300 uppercase font-mono text-xs">
                        {r.difficulty}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400 font-mono text-xs">
                        {r.languages.map((l) => l.slice(0, 2).toUpperCase()).join(" ")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-pixel text-[9px] px-1.5 py-1 border-2 ${chip.cls}`}>
                          {chip.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums font-mono">
                        {r.solves}
                      </td>
                      <td className="px-4 py-2.5 text-right text-indigo-400 font-mono tabular-nums font-semibold">
                        {r.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StatCard({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "fuchsia";
}) {
  const color =
    accent === "emerald" ? "text-indigo-400"
    : accent === "fuchsia" ? "text-fuchsia-400"
    : "text-zinc-100";
  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-5">
      <div className="font-pixel text-[10px] text-zinc-500">{label}</div>
      <div className={`text-3xl font-mono tabular-nums mt-3 ${color}`}>{value}</div>
    </div>
  );
}
