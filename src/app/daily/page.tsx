import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/daily";
import AuthNav from "@/components/AuthNav";
import Avatar from "@/components/Avatar";
import ShareDailyButton from "@/components/ShareDailyButton";

export const metadata = { title: "Daily — Devrace" };

export default async function DailyPage() {
  const dayKey = todayKey();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const [myAttempt, top] = await Promise.all([
    userId
      ? prisma.dailyAttempt.findUnique({
          where: { userId_dayKey: { userId, dayKey } },
        })
      : Promise.resolve(null),
    prisma.dailyAttempt.findMany({
      where: { dayKey },
      orderBy: { score: "desc" },
      take: 10,
      select: {
        id: true,
        score: true,
        timeMs: true,
        success: true,
        userId: true,
        user: { select: { name: true, email: true, image: true, handle: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen text-zinc-100">
      <nav className="border-b-2 border-zinc-800 px-6 h-14 flex items-center justify-between bg-zinc-950">
        <Link
          href="/home"
          className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition"
        >
          ← HOME
        </Link>
        <div className="font-pixel text-xs text-amber-400 tracking-widest">DAILY</div>
        <AuthNav />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <section className="text-center">
          <div className="font-mono text-xs text-indigo-400 mb-3">{`> ${dayKey}`}</div>
          <h1 className="font-pixel text-2xl sm:text-3xl leading-relaxed">
            TODAY&apos;S BUG.
          </h1>
          <p className="text-zinc-400 mt-4">
            One bug. One attempt. Same challenge for every player. New bug at UTC midnight.
          </p>

          <div className="mt-8">
            {!userId ? (
              <div className="border-2 border-zinc-800 bg-zinc-900 p-6 inline-block">
                <p className="text-zinc-300 mb-4">Log in to play today&apos;s challenge.</p>
                <Link
                  href="/login?next=/daily"
                  className="btn-press inline-block px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
                >
                  ▶ LOG IN
                </Link>
              </div>
            ) : myAttempt ? (
              <div className="inline-block">
                <ResultCard
                  success={myAttempt.success}
                  score={myAttempt.score}
                  timeMs={myAttempt.timeMs}
                />
                <ShareDailyButton
                  dayKey={dayKey}
                  success={myAttempt.success}
                  timeMs={myAttempt.timeMs}
                  score={myAttempt.score}
                />
              </div>
            ) : (
              <Link
                href="/daily/play"
                className="btn-press inline-block px-8 py-3 font-pixel text-xs border-2 border-zinc-950 bg-amber-400 text-zinc-950"
              >
                ▶ PLAY TODAY&apos;S BUG
              </Link>
            )}
          </div>
        </section>

        <section>
          <div className="font-mono text-xs text-indigo-400 mb-3">{"// today's top 10"}</div>
          <h2 className="font-pixel text-lg mb-5">FASTEST SOLVES</h2>

          {top.length === 0 ? (
            <div className="border-2 border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="font-pixel text-sm text-zinc-400">NO ATTEMPTS YET</p>
              <p className="text-zinc-500 text-sm mt-2">Be the first today.</p>
            </div>
          ) : (
            <div className="border-2 border-zinc-800 bg-zinc-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950 border-b-2 border-zinc-800">
                  <tr className="font-pixel text-[10px] text-zinc-400">
                    <th className="text-left px-3 py-3 w-12"></th>
                    <th className="text-left px-3 py-3">PLAYER</th>
                    <th className="text-right px-3 py-3">TIME</th>
                    <th className="text-right px-3 py-3 text-indigo-400">SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((row, i) => {
                    const name = row.user.name ?? row.user.email.split("@")[0];
                    const href = row.user.handle ? `/u/${row.user.handle}` : null;
                    const mine = row.userId === userId;
                    const seconds = (row.timeMs / 1000).toFixed(1);
                    return (
                      <tr
                        key={row.id}
                        className={`${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950/60"} ${
                          mine ? "outline outline-2 -outline-offset-2 outline-indigo-500/60" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          {href ? (
                            <Link href={href}>
                              <Avatar src={row.user.image} name={name} size={32} />
                            </Link>
                          ) : (
                            <Avatar src={row.user.image} name={name} size={32} />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {href ? (
                            <Link href={href} className="hover:text-indigo-400 transition">
                              <span className="font-pixel text-[10px] text-indigo-400 mr-2">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="font-medium">{name}</span>
                              {mine && (
                                <span className="ml-2 font-pixel text-[9px] text-indigo-400">· YOU</span>
                              )}
                            </Link>
                          ) : (
                            <>
                              <span className="font-pixel text-[10px] text-indigo-400 mr-2">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="font-medium">{name}</span>
                              {mine && (
                                <span className="ml-2 font-pixel text-[9px] text-indigo-400">· YOU</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-zinc-400 font-mono tabular-nums">
                          {row.success ? `${seconds}s` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-indigo-400 font-mono tabular-nums font-semibold">
                          {row.score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {myAttempt && (
          <p className="text-center font-pixel text-[10px] text-zinc-500">
            COME BACK TOMORROW
          </p>
        )}
      </main>
    </div>
  );
}

function ResultCard({
  success,
  score,
  timeMs,
}: {
  success: boolean;
  score: number;
  timeMs: number;
}) {
  const headline = success ? "SOLVED" : "FAILED";
  const color = success ? "text-indigo-400" : "text-fuchsia-400";
  const seconds = (timeMs / 1000).toFixed(1);
  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-6 inline-block min-w-[280px]">
      <div className={`font-pixel text-sm mb-4 ${color}`}>{headline}</div>
      <div className="text-5xl font-mono tabular-nums">{score}</div>
      <div className="text-zinc-500 text-sm mt-2">
        {success ? `solved in ${seconds}s` : "no points"}
      </div>
    </div>
  );
}
