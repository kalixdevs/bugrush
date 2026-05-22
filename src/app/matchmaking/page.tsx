import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MatchRow from "@/components/match/MatchRow";
import { isMatchExpired } from "@/lib/match";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export const metadata = { title: "Matchmaking — Bugrush" };

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
    <div className="text-zinc-100 relative z-10">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <PageHeader
          eyebrow="// pvp"
          title="PUBLIC MATCHMAKING"
          right={
            <Link
              href={userId ? "/matchmaking/create" : "/login?next=/matchmaking/create"}
              className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
            >
              ▶ CREATE A MATCH
            </Link>
          }
        />

        {matches.length === 0 ? (
          <EmptyState title="NO OPEN MATCHES" hint="Be the first to host." />
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
