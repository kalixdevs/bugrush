import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/daily";
import { rankFor } from "@/lib/ranks";
import { BADGES } from "@/lib/badges";
import AuthNav from "@/components/AuthNav";
import ChatSidebar from "@/components/ChatSidebar";
import PointsBadge from "@/components/PointsBadge";
import EventBanner from "@/components/EventBanner";

export const metadata = { title: "Home — Bugrush" };

export default async function HomePage() {
  const dayKey = todayKey();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const [me, myAttempt, myReward, achievementCount] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, handle: true, points: true, rankPoints: true },
        })
      : Promise.resolve(null),
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
  ]);

  const displayName = me?.name ?? me?.handle ?? "stranger";
  const points = me?.points ?? 0;
  const rank = rankFor(me?.rankPoints ?? 0);

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col relative z-10">
      <EventBanner />
      <TopStrip points={points} loggedIn={!!userId} />

      <div className="flex flex-1 min-h-0">
        <aside className="w-80 flex-shrink-0 border-r-2 border-zinc-800 bg-zinc-900 hidden lg:flex flex-col">
          <ChatSidebar loggedIn={!!userId} />
        </aside>

        <main className="flex-1 px-6 py-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="font-pixel text-3xl sm:text-4xl">
              welcome back <span className="text-indigo-400">{displayName.toLowerCase()}</span>
            </h1>

            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <FeatureCard
                label="DAILY CHALLENGE"
                href="/daily"
                state={
                  !userId ? "LOCKED"
                  : myAttempt ? (myAttempt.success ? "SOLVED" : "MISSED")
                  : "READY"
                }
                stateTone={
                  !userId ? "amber"
                  : myAttempt?.success ? "emerald"
                  : myAttempt ? "fuchsia"
                  : "emerald"
                }
              />
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
              <RankCard rankLabel={rank.label} progress={rank.progress} isMax={rank.isMax} />
            </section>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
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
          </div>
        </main>
      </div>

      <footer className="border-t-2 border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between font-pixel text-[10px] text-zinc-500">
          <div>© {new Date().getFullYear()} BUGRUSH</div>
          <Link href="/?welcome=1" className="hover:text-indigo-400 transition">
            WHAT IS THIS? →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function TopStrip({ points, loggedIn }: { points: number; loggedIn: boolean }) {
  return (
    <nav className="border-b-2 border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/home" className="font-pixel text-indigo-400 text-xs tracking-widest">
          BUGRUSH
        </Link>
        <div className="flex items-center gap-5 text-xs font-pixel">
          {loggedIn && <PointsBadge value={points} />}
          <Link href="/leaderboard" className="text-zinc-400 hover:text-indigo-400 transition">
            LEADERBOARD
          </Link>
          <Link href="/daily" className="text-zinc-400 hover:text-indigo-400 transition">
            DAILY
          </Link>
          <Link
            href={loggedIn ? "/redeem" : "/login?next=/redeem"}
            className="text-zinc-400 hover:text-indigo-400 transition"
          >
            REDEEM
          </Link>
          <AuthNav />
        </div>
      </div>
    </nav>
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
      className="border-2 border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition flex flex-col justify-between min-h-[120px]"
    >
      <div className="font-pixel text-[11px] text-zinc-300 leading-tight">{label}</div>
      <div className={`font-pixel text-base mt-4 ${stateColor}`}>{state}</div>
    </Link>
  );
}

function RankCard({
  rankLabel, progress, isMax,
}: {
  rankLabel: string;
  progress: number;
  isMax: boolean;
}) {
  return (
    <Link
      href="/profile"
      className="border-2 border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition flex flex-col justify-between min-h-[120px]"
    >
      <div className="font-pixel text-[11px] text-zinc-300 leading-tight">YOUR RANKING</div>
      <div>
        <div className="font-pixel text-sm text-indigo-400 mt-2 truncate">{rankLabel}</div>
        {!isMax && (
          <div className="mt-3 h-1.5 bg-zinc-950 border border-zinc-800">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {!isMax && (
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            {progress}/100 RP
          </div>
        )}
      </div>
    </Link>
  );
}
