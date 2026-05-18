import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BracketGrid from "@/components/tournament/BracketGrid";

export const metadata = { title: "Tournament — Bugrush" };

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      slots: {
        orderBy: { seed: "asc" },
        include: { user: { select: { id: true, handle: true, name: true } } },
      },
      brackets: {
        include: { match: { select: { id: true, status: true } } },
      },
    },
  });
  if (!t) notFound();

  const slots = t.slots.map((s) => ({
    seed: s.seed,
    userId: s.userId,
    handle: s.user?.handle ?? null,
    name: s.user?.name ?? null,
  }));
  const brackets = t.brackets.map((b) => ({
    id: b.id,
    round: b.round,
    position: b.position,
    player1Id: b.player1Id,
    player2Id: b.player2Id,
    winnerUserId: b.winnerUserId,
    matchId: b.matchId,
    matchStatus: b.match?.status ?? null,
  }));

  const statusColor =
    t.status === "in_progress" ? "text-indigo-300"
    : t.status === "finished" ? "text-amber-300"
    : t.status === "cancelled" ? "text-fuchsia-300"
    : "text-zinc-400";

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// tournament"}</div>
        <h1 className="font-pixel text-3xl mt-2">{t.name}</h1>
        <div className="text-xs font-mono text-zinc-500 mt-2">
          {t.size}-PLAYER · {t.difficulty.toUpperCase()} · {t.language.toUpperCase()} ·{" "}
          <span className={statusColor}>{t.status.toUpperCase()}</span>
        </div>
      </div>

      {t.status === "draft" ? (
        <div className="border-2 border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500 text-sm">
          Tournament not started yet.
        </div>
      ) : (
        <BracketGrid size={t.size} slots={slots} brackets={brackets} />
      )}
    </main>
  );
}
