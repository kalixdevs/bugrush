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

  return <Leaderboard difficulty={difficulty} baseHref="/leaderboard" />;
}
