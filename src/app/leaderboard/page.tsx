import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import Leaderboard from "@/components/Leaderboard";

export const metadata = { title: "Leaderboard — Bugrush" };

const VALID_BOARDS = ["easy", "normal", "hard", "hardcore"] as const;
type Board = (typeof VALID_BOARDS)[number];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;
  const difficulty: Board | undefined =
    board && (VALID_BOARDS as readonly string[]).includes(board)
      ? (board as Board)
      : undefined;

  return (
    <div className="min-h-screen text-zinc-100">
      <nav className="border-b-2 border-zinc-800 px-6 h-14 flex items-center justify-between bg-zinc-950">
        <Link
          href="/home"
          className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition"
        >
          ← HOME
        </Link>
        <div className="font-pixel text-xs text-indigo-400 tracking-widest">
          LEADERBOARD
        </div>
        <AuthNav />
      </nav>

      <Leaderboard difficulty={difficulty} baseHref="/leaderboard" />
    </div>
  );
}
