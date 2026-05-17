import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuthNav from "@/components/AuthNav";
import MatchRow from "@/components/match/MatchRow";
import { isMatchExpired } from "@/lib/match";

export const metadata = { title: "Matchmaking — Devrace" };

export default async function MatchmakingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const rows = await prisma.match.findMany({
    where: {
      privacy: "public",
      status: { in: ["ready", "in_progress"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, handle: true, image: true } },
        },
      },
    },
  });

  const matches = rows.filter((m) => !isMatchExpired(m));

  return (
    <div className="min-h-screen text-zinc-100 relative z-10">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/home" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
            ← HOME
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">MATCHMAKING</div>
          <AuthNav />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-indigo-400 mb-2">{"// pvp"}</div>
            <h1 className="font-pixel text-2xl sm:text-3xl">PUBLIC MATCHMAKING</h1>
          </div>
          <Link
            href={userId ? "/matchmaking/create" : "/login?next=/matchmaking/create"}
            className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            ▶ CREATE A MATCH
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="border-2 border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="font-pixel text-sm text-zinc-400">NO OPEN MATCHES</p>
            <p className="text-zinc-500 text-sm mt-2">Be the first to host.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} viewerId={userId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
