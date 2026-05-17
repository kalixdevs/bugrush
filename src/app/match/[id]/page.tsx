import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuthNav from "@/components/AuthNav";
import MatchView from "@/components/match/MatchView";

export const metadata = { title: "Match — Devrace" };

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, name: true, handle: true, image: true } },
        },
      },
    },
  });
  if (!match) notFound();

  return (
    <div className="min-h-screen text-zinc-100 relative z-10">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/matchmaking" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
            ← MATCHMAKING
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">MATCH</div>
          <AuthNav />
        </div>
      </nav>

      <MatchView
        match={{
          id: match.id,
          hostId: match.hostId,
          mode: match.mode,
          privacy: match.privacy,
          difficulty: match.difficulty,
          language: match.language,
          roundSeconds: match.roundSeconds,
          status: match.status,
          challengeId: match.challengeId,
          startedAt: match.startedAt ? match.startedAt.toISOString() : null,
          winnerTeam: match.winnerTeam,
          participants: match.participants.map((p) => ({
            userId: p.userId,
            name: p.user.name ?? p.user.handle ?? "anon",
            handle: p.user.handle,
            image: p.user.image,
            team: p.team,
            ready: p.ready,
            score: p.score,
            solveTimeMs: p.solveTimeMs,
            submitted: p.submittedCode != null,
          })),
        }}
        viewerId={userId}
      />
    </div>
  );
}
