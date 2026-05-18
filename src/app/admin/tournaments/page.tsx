import { prisma } from "@/lib/db";
import TournamentAdminPanel from "@/components/admin/TournamentAdminPanel";

export const metadata = { title: "Admin · Tournaments — Bugrush" };

export default async function AdminTournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      slots: { include: { user: { select: { handle: true, name: true } } } },
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// tournaments"}</div>
        <h1 className="font-pixel text-3xl mt-2">TOURNAMENTS</h1>
      </div>
      <TournamentAdminPanel
        initial={tournaments.map((t) => ({
          id: t.id,
          name: t.name,
          size: t.size,
          status: t.status,
          difficulty: t.difficulty,
          language: t.language,
          roundSeconds: t.roundSeconds,
          createdAt: t.createdAt.toISOString(),
          slots: t.slots
            .slice()
            .sort((a, b) => a.seed - b.seed)
            .map((s) => ({
              seed: s.seed,
              userId: s.userId,
              handle: s.user?.handle ?? null,
              name: s.user?.name ?? null,
            })),
        }))}
      />
    </div>
  );
}
