import Link from "next/link";
import { totalRounds } from "@/lib/bracket";

type Slot = { seed: number; handle: string | null; name: string | null; userId: string | null };

type BracketCell = {
  id: string;
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerUserId: string | null;
  matchId: string | null;
  matchStatus: string | null;
};

type Props = {
  size: number;
  slots: Slot[];
  brackets: BracketCell[];
};

function labelFor(
  userId: string | null,
  slots: Slot[],
  userMap: Map<string, { handle: string | null; name: string | null }>,
): string {
  if (!userId) return "—";
  const slot = slots.find((s) => s.userId === userId);
  const u = userMap.get(userId) ?? (slot ? { handle: slot.handle, name: slot.name } : null);
  return u?.handle ?? u?.name ?? "?";
}

const ROUND_LABELS = ["ROUND 1", "QF", "SF", "FINAL"];

export default function BracketGrid({ size, slots, brackets }: Props) {
  const rounds = totalRounds(size);
  const userMap = new Map<string, { handle: string | null; name: string | null }>();
  for (const s of slots) {
    if (s.userId) userMap.set(s.userId, { handle: s.handle, name: s.name });
  }

  // Build per-round columns.
  const byRound: BracketCell[][] = [];
  for (let r = 0; r < rounds; r++) {
    byRound.push(
      brackets
        .filter((b) => b.round === r)
        .sort((a, b) => a.position - b.position),
    );
  }

  // Add an extra "winner" column showing the champion.
  const finalCell = byRound[rounds - 1]?.[0];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-fit pb-4">
        {byRound.map((col, r) => {
          // Vertical spacing increases per round so pairs line up.
          const gap = Math.pow(2, r) * 12;
          return (
            <div key={r} className="flex flex-col" style={{ gap: `${gap}px`, paddingTop: r === 0 ? 0 : `${gap / 2}px` }}>
              <div className="font-pixel text-[10px] text-zinc-500 tracking-widest mb-2">
                {ROUND_LABELS[rounds - 1 - (rounds - 1 - r)] ?? `R${r + 1}`}
              </div>
              {col.map((cell) => {
                const p1 = labelFor(cell.player1Id, slots, userMap);
                const p2 = labelFor(cell.player2Id, slots, userMap);
                const w1 = cell.winnerUserId === cell.player1Id;
                const w2 = cell.winnerUserId === cell.player2Id;
                const live = cell.matchStatus === "in_progress";
                const done = cell.matchStatus === "finished";

                const inner = (
                  <div
                    className={`border-2 ${
                      live ? "border-indigo-500" : done ? "border-zinc-700" : "border-zinc-800"
                    } bg-zinc-900 w-36 sm:w-44 md:w-48`}
                  >
                    <Slot label={p1} winner={w1} highlight={!!cell.player1Id && cell.winnerUserId === null} />
                    <div className="h-px bg-zinc-800" />
                    <Slot label={p2} winner={w2} highlight={!!cell.player2Id && cell.winnerUserId === null} />
                  </div>
                );

                return cell.matchId ? (
                  <Link key={cell.id} href={`/match/${cell.matchId}`} className="block hover:opacity-90 transition">
                    {inner}
                  </Link>
                ) : (
                  <div key={cell.id}>{inner}</div>
                );
              })}
            </div>
          );
        })}

        {finalCell && finalCell.winnerUserId && (
          <div className="flex flex-col justify-center pl-2">
            <div className="font-pixel text-[10px] text-amber-400 tracking-widest mb-2">CHAMPION</div>
            <div className="border-2 border-amber-400 bg-amber-400/10 px-4 py-3 w-36 sm:w-44 md:w-48">
              <div className="font-pixel text-sm text-amber-300">
                {labelFor(finalCell.winnerUserId, slots, userMap)}
              </div>
              <div className="font-pixel text-[9px] text-amber-400/80 mt-1">★ WINNER</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Slot({ label, winner, highlight }: { label: string; winner: boolean; highlight: boolean }) {
  return (
    <div
      className={`px-3 py-2 font-mono text-sm flex items-center justify-between ${
        winner
          ? "text-emerald-300"
          : highlight
          ? "text-zinc-100"
          : label === "—"
          ? "text-zinc-600"
          : "text-zinc-400"
      }`}
    >
      <span className="truncate">{label}</span>
      {winner && <span className="text-[10px] font-pixel">✓</span>}
    </div>
  );
}
