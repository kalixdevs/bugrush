import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey, getDailyChallenge } from "@/lib/daily";
import { rankFor } from "@/lib/ranks";
import { BADGES, findBadge } from "@/lib/badges";
import { computeStreaks } from "@/lib/streaks";

export const metadata = { title: "Home — Bugrush" };

const DIFF_TONE: Record<string, string> = {
  easy: "border-emerald-500 text-emerald-300",
  normal: "border-sky-500 text-sky-300",
  hard: "border-fuchsia-500 text-fuchsia-300",
  hardcore: "border-fuchsia-500 text-fuchsia-200",
};

export default async function HomePage() {
  const dayKey = todayKey();
  const challenge = getDailyChallenge(dayKey);
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, handle: true, points: true, rankPoints: true },
      })
    : null;

  const [
    myAttempt, myReward, achievementCount,
    dailyStats, recentRuns, recentDailies, recentMatches, recentBadges,
    rankedCount, betterCount, activeToday, inProgressMatches,
    myDailyKeys,
  ] = await Promise.all([
    userId
      ? prisma.dailyAttempt.findUnique({
          where: { userId_dayKey: { userId, dayKey } },
        })
      : Promise.resolve(null),
    userId
      ? prisma.dailyReward.findUnique({
          where: { userId_dayKey: { userId, dayKey } },
        })
      : Promise.resolve(null),
    userId
      ? prisma.achievement.count({ where: { userId } })
      : Promise.resolve(0),
    prisma.dailyAttempt.aggregate({
      where: { dayKey, success: true },
      _count: { _all: true },
      _min: { timeMs: true },
    }),
    prisma.run.findMany({
      where: { score: { gte: 500 } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true, score: true, createdAt: true,
        user: { select: { handle: true, name: true } },
      },
    }),
    prisma.dailyAttempt.findMany({
      where: { success: true, dayKey },
      orderBy: { timeMs: "asc" },
      take: 4,
      select: {
        id: true, timeMs: true, createdAt: true,
        user: { select: { handle: true, name: true } },
      },
    }),
    prisma.match.findMany({
      where: { status: "finished", winnerTeam: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 4,
      select: {
        id: true, mode: true, finishedAt: true, winnerTeam: true,
        participants: {
          select: { team: true, user: { select: { handle: true, name: true } } },
        },
      },
    }),
    prisma.achievement.findMany({
      orderBy: { unlockedAt: "desc" },
      take: 4,
      select: {
        id: true, badgeId: true, unlockedAt: true,
        user: { select: { handle: true, name: true } },
      },
    }),
    prisma.user.count({ where: { rankPoints: { gt: 0 } } }),
    me?.rankPoints != null
      ? prisma.user.count({ where: { rankPoints: { gt: me.rankPoints } } })
      : Promise.resolve(0),
    prisma.run.findMany({
      where: { createdAt: { gte: todayStart } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.match.count({ where: { status: "in_progress" } }),
    userId
      ? prisma.dailyAttempt.findMany({
          where: { userId, success: true },
          select: { dayKey: true },
        })
      : Promise.resolve([]),
  ]);

  const displayName = me?.name ?? me?.handle ?? "stranger";
  const rank = rankFor(me?.rankPoints ?? 0);

  const dailySolves = dailyStats._count._all;
  const bestTimeMs = dailyStats._min.timeMs;

  const streaks = computeStreaks(myDailyKeys.map((d) => d.dayKey));
  const activeTodayCount = activeToday.length;
  const topPercent =
    rankedCount > 0 && me?.rankPoints != null && me.rankPoints > 0
      ? Math.max(0.1, Math.round((betterCount / rankedCount) * 1000) / 10)
      : null;

  // Compose unified feed.
  type FeedItem = { id: string; ts: number; text: React.ReactNode };
  const feed: FeedItem[] = [];
  for (const r of recentRuns) {
    feed.push({
      id: `r:${r.id}`,
      ts: r.createdAt.getTime(),
      text: (
        <>
          <FeedName name={r.user.handle ?? r.user.name ?? "anon"} />{" "}
          <span className="text-zinc-400">scored</span>{" "}
          <span className="text-indigo-300 font-mono">{r.score}</span>
        </>
      ),
    });
  }
  for (const d of recentDailies) {
    feed.push({
      id: `d:${d.id}`,
      ts: d.createdAt.getTime(),
      text: (
        <>
          <FeedName name={d.user.handle ?? d.user.name ?? "anon"} />{" "}
          <span className="text-zinc-400">solved Today&apos;s Incident in</span>{" "}
          <span className="text-amber-300 font-mono">{(d.timeMs / 1000).toFixed(1)}s</span>
        </>
      ),
    });
  }
  for (const m of recentMatches) {
    if (m.finishedAt == null || m.winnerTeam == null) continue;
    const winners = m.participants
      .filter((p) => p.team === m.winnerTeam)
      .map((p) => p.user.handle ?? p.user.name ?? "anon");
    if (winners.length === 0) continue;
    feed.push({
      id: `m:${m.id}`,
      ts: m.finishedAt.getTime(),
      text: (
        <>
          <FeedName name={winners[0]} />
          {winners.length > 1 && <span className="text-zinc-500"> +{winners.length - 1}</span>}{" "}
          <span className="text-zinc-400">won a</span>{" "}
          <span className="text-fuchsia-300 font-mono">{m.mode.toUpperCase()}</span>
        </>
      ),
    });
  }
  for (const a of recentBadges) {
    const badge = findBadge(a.badgeId);
    if (!badge) continue;
    feed.push({
      id: `a:${a.id}`,
      ts: a.unlockedAt.getTime(),
      text: (
        <>
          <FeedName name={a.user.handle ?? a.user.name ?? "anon"} />{" "}
          <span className="text-zinc-400">unlocked</span>{" "}
          <span className="text-amber-300">{badge.name}</span>
        </>
      ),
    });
  }
  feed.sort((a, b) => b.ts - a.ts);
  const feedItems = feed.slice(0, 10);

  const dailyState = !userId
    ? { label: "LOG IN TO PLAY", href: "/login?next=/daily/play", tone: "amber" as const }
    : myAttempt
      ? myAttempt.success
        ? { label: `✓ SOLVED IN ${(myAttempt.timeMs / 1000).toFixed(1)}s`, href: "/daily", tone: "emerald" as const }
        : { label: "MISSED — COMES BACK TOMORROW", href: "/daily", tone: "fuchsia" as const }
      : { label: "▶ PLAY NOW", href: "/daily/play", tone: "indigo" as const };
  const diffTone = DIFF_TONE[challenge.difficulty] ?? DIFF_TONE.normal;
  const ctaCls = {
    indigo: "bg-indigo-500 text-zinc-950",
    emerald: "bg-emerald-500 text-zinc-950",
    fuchsia: "bg-fuchsia-500 text-zinc-950",
    amber: "bg-amber-400 text-zinc-950",
  }[dailyState.tone];

  return (
    <div className="text-zinc-100 relative z-10">
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-pixel text-2xl sm:text-3xl">
            welcome back <span className="text-indigo-400">{displayName.toLowerCase()}</span>
          </h1>
          <PulseStrip
            ranked={rankedCount}
            activeToday={activeTodayCount}
            inMatches={inProgressMatches}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Hero: Today's Incident */}
          <section className="lg:col-span-2 border-2 border-indigo-500 bg-zinc-900 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="font-pixel text-[10px] tracking-widest text-indigo-400">
                  TODAY&apos;S INCIDENT
                </div>
                <div className="font-mono text-[10px] text-zinc-500">{dayKey}</div>
              </div>
              <h2 className="font-pixel text-2xl sm:text-3xl text-zinc-100 leading-snug">
                &ldquo;{challenge.title}&rdquo;
              </h2>
              <p className="text-zinc-400 text-sm mt-3">{challenge.hint}</p>

              <div className="flex flex-wrap items-center gap-3 mt-5 text-xs">
                <span className={`font-pixel text-[10px] tracking-widest px-2 py-1 border-2 ${diffTone}`}>
                  {challenge.difficulty.toUpperCase()}
                </span>
                <span className="font-pixel text-[10px] tracking-widest px-2 py-1 border-2 border-zinc-700 text-zinc-300">
                  {challenge.language.toUpperCase()}
                </span>
                <span className="text-zinc-500 font-mono">
                  Best today:{" "}
                  <span className="text-amber-300">
                    {bestTimeMs != null ? `${(bestTimeMs / 1000).toFixed(1)}s` : "—"}
                  </span>
                </span>
                <span className="text-zinc-500 font-mono">
                  Solves:{" "}
                  <span className="text-indigo-300">{dailySolves}</span>
                </span>
              </div>

              <Link
                href={dailyState.href}
                className={`btn-press mt-6 inline-block px-8 py-3 font-pixel text-sm border-2 border-zinc-950 ${ctaCls}`}
              >
                {dailyState.label}
              </Link>
            </div>
          </section>

          {/* Live Activity Feed */}
          <section className="border-2 border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="px-4 py-3 border-b-2 border-zinc-800 flex items-center justify-between">
              <div className="font-pixel text-xs text-indigo-400">LIVE FEED</div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                live
              </div>
            </div>
            <ul className="flex-1 divide-y divide-zinc-800 overflow-y-auto max-h-[360px]">
              {feedItems.length === 0 && (
                <li className="px-4 py-6 text-zinc-600 text-xs font-mono text-center">
                  quiet… for now.
                </li>
              )}
              {feedItems.map((it) => (
                <li key={it.id} className="px-4 py-2 text-xs leading-snug">
                  {it.text}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Action row: solo + lobby */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/play"
            className="btn-press inline-block px-8 py-4 font-pixel text-sm border-2 border-zinc-950 bg-zinc-800 text-zinc-100"
          >
            ▶ SOLO PLAY
          </Link>
          <Link
            href="/matchmaking"
            className="btn-press inline-block px-12 py-5 font-pixel text-base border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            ▶ ENTER LOBBY
          </Link>
        </div>

        {/* Secondary cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <RankCard
            rankLabel={rank.label}
            progress={rank.progress}
            isMax={rank.isMax}
            topPercent={topPercent}
          />
          <StreakCard current={streaks.current} longest={streaks.longest} loggedIn={!!userId} />
          <FeatureCard
            label="COSMETIC SHOP"
            href="/shop"
            state="OPEN"
            stateTone="emerald"
          />
          <FeatureCard
            label="DAILY REWARDS"
            href={userId ? "/rewards" : "/login?next=/rewards"}
            state={!userId ? "LOCKED" : myReward ? "OPENED" : "READY"}
            stateTone={!userId ? "amber" : myReward ? "zinc" : "amber"}
          />
          <FeatureCard
            label="ACHIEVEMENTS"
            href={userId ? "/profile#achievements" : "/login?next=/profile"}
            state={userId ? `${achievementCount}/${BADGES.length}` : "LOCKED"}
            stateTone={userId ? "emerald" : "amber"}
          />
        </section>
      </main>
    </div>
  );
}

function FeedName({ name }: { name: string }) {
  return (
    <Link
      href={`/u/${name.toLowerCase()}`}
      className="text-zinc-100 font-semibold hover:text-indigo-300 transition"
    >
      {name}
    </Link>
  );
}

type Tone = "emerald" | "fuchsia" | "amber" | "zinc";

function FeatureCard({
  label, href, state, stateTone,
}: {
  label: string;
  href: string;
  state: string;
  stateTone: Tone;
}) {
  const stateColor = {
    emerald: "text-indigo-400",
    fuchsia: "text-fuchsia-400",
    amber: "text-amber-400",
    zinc: "text-zinc-500",
  }[stateTone];
  return (
    <Link
      href={href}
      className="border-2 border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition flex flex-col justify-between min-h-[96px]"
    >
      <div className="font-pixel text-[10px] text-zinc-300 leading-tight">{label}</div>
      <div className={`font-pixel text-sm mt-3 ${stateColor}`}>{state}</div>
    </Link>
  );
}

function RankCard({
  rankLabel, progress, isMax, topPercent,
}: {
  rankLabel: string;
  progress: number;
  isMax: boolean;
  topPercent: number | null;
}) {
  return (
    <Link
      href="/profile"
      className="border-2 border-indigo-500 bg-zinc-900 p-4 hover:bg-zinc-950 transition flex flex-col justify-between min-h-[96px] relative overflow-hidden"
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-indigo-500/15 blur-2xl pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div className="font-pixel text-[10px] text-indigo-300 tracking-widest">RANK</div>
        <div className="w-6 h-6 border-2 border-indigo-500 grid place-items-center text-indigo-300 font-pixel text-[10px]">
          {isMax ? "★" : "▲"}
        </div>
      </div>
      <div className="relative">
        <div className="font-pixel text-sm text-zinc-100 mt-2 truncate">{rankLabel}</div>
        {topPercent != null && (
          <div className="text-[10px] font-mono text-amber-300 mt-1">
            TOP {topPercent}%
          </div>
        )}
        {!isMax && (
          <>
            <div className="mt-2 h-1.5 bg-zinc-950 border border-zinc-800">
              <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">{progress}/100 RP</div>
          </>
        )}
      </div>
    </Link>
  );
}

function StreakCard({
  current, longest, loggedIn,
}: {
  current: number;
  longest: number;
  loggedIn: boolean;
}) {
  if (!loggedIn) {
    return (
      <div className="border-2 border-zinc-800 bg-zinc-900 p-4 flex flex-col justify-between min-h-[96px]">
        <div className="font-pixel text-[10px] text-zinc-500 tracking-widest">STREAK</div>
        <div className="font-pixel text-sm text-zinc-600">LOG IN</div>
      </div>
    );
  }
  const fire = current >= 7 ? "🔥" : current >= 1 ? "•" : "";
  return (
    <Link
      href="/daily"
      className={`border-2 ${current >= 1 ? "border-amber-400" : "border-zinc-800"} bg-zinc-900 p-4 hover:bg-zinc-950 transition flex flex-col justify-between min-h-[96px]`}
    >
      <div className="font-pixel text-[10px] text-amber-300 tracking-widest">DAILY STREAK</div>
      <div>
        <div className="font-pixel text-2xl text-amber-300 leading-none flex items-baseline gap-2">
          <span className="tabular-nums">{current}</span>
          <span className="text-xs text-amber-400/70">{current === 1 ? "day" : "days"} {fire}</span>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 mt-1">longest {longest}</div>
      </div>
    </Link>
  );
}

function PulseStrip({
  ranked, activeToday, inMatches,
}: {
  ranked: number;
  activeToday: number;
  inMatches: number;
}) {
  return (
    <div className="flex items-center gap-4 text-[10px] font-pixel tracking-widest border-2 border-zinc-800 bg-zinc-950 px-3 py-2">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-zinc-500">ACTIVE TODAY</span>
        <span className="text-emerald-300 font-mono">{activeToday}</span>
      </span>
      <span className="text-zinc-700">·</span>
      <span>
        <span className="text-zinc-500">RANKED </span>
        <span className="text-indigo-300 font-mono">{ranked}</span>
      </span>
      <span className="text-zinc-700">·</span>
      <span>
        <span className="text-zinc-500">IN MATCHES </span>
        <span className="text-fuchsia-300 font-mono">{inMatches}</span>
      </span>
    </div>
  );
}
