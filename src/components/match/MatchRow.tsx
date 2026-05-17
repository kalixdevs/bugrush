import Link from "next/link";
import Avatar from "@/components/Avatar";
import { maxPlayers, type MatchMode } from "@/lib/match";

type RowMatch = {
  id: string;
  mode: string;
  difficulty: string;
  language: string;
  roundSeconds: number;
  status: string;
  participants: Array<{
    team: number;
    user: { id: string; name: string | null; handle: string | null; image: string | null };
  }>;
};

type Props = { match: RowMatch; viewerId: string | null };

export default function MatchRow({ match, viewerId }: Props) {
  const team0 = match.participants.filter((p) => p.team === 0);
  const team1 = match.participants.filter((p) => p.team === 1);
  const cap = maxPlayers(match.mode as MatchMode);
  const filled = match.participants.length;
  const isMine = viewerId != null && match.participants.some((p) => p.user.id === viewerId);

  const actionLabel = match.status === "in_progress"
    ? "WATCH"
    : isMine ? "OPEN"
    : "▶ JOIN BATTLE";

  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="font-pixel text-xs text-indigo-400 w-12">{match.mode}</div>

      <div className="flex items-center gap-2 min-w-[140px]">
        {team0.map((p) => (
          <Avatar key={p.user.id} src={p.user.image} name={p.user.name ?? "anon"} size={28} />
        ))}
        {Array.from({ length: cap / 2 - team0.length }).map((_, i) => (
          <div key={`e0-${i}`} className="w-7 h-7 border-2 border-dashed border-zinc-700" />
        ))}
        <span className="text-zinc-500 mx-1">✕</span>
        {team1.map((p) => (
          <Avatar key={p.user.id} src={p.user.image} name={p.user.name ?? "anon"} size={28} />
        ))}
        {Array.from({ length: cap / 2 - team1.length }).map((_, i) => (
          <div key={`e1-${i}`} className="w-7 h-7 border-2 border-dashed border-zinc-700" />
        ))}
      </div>

      <span className="font-pixel text-[10px] px-2 py-1 border-2 border-zinc-700 bg-zinc-950 text-zinc-300 uppercase">
        {match.language.slice(0, 2)}
      </span>
      <span className="font-pixel text-[10px] px-2 py-1 border-2 border-zinc-700 bg-zinc-950 text-zinc-300 uppercase">
        {match.difficulty}
      </span>
      <span className="font-pixel text-[10px] px-2 py-1 border-2 border-zinc-700 bg-zinc-950 text-zinc-300">
        {match.roundSeconds}s
      </span>
      <span className="font-pixel text-[10px] text-zinc-500 ml-auto">
        {filled}/{cap}
      </span>

      <Link
        href={`/match/${match.id}`}
        className={`btn-press px-4 py-2 font-pixel text-[10px] border-2 border-zinc-950 ${
          match.status === "in_progress"
            ? "bg-zinc-800 text-zinc-300"
            : "bg-indigo-500 text-zinc-950"
        }`}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
