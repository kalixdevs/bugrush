import Link from "next/link";
import HideChrome from "@/components/HideChrome";
import NotFoundGame from "@/components/NotFoundGame";

export const metadata = { title: "Not found — Bugrush" };

/** Branded 404 — with a hidden Snake game to pass the time. */
export default function NotFound() {
  return (
    <div className="min-h-[85vh] grid place-items-center px-6 py-10 text-zinc-100">
      <HideChrome />
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="font-mono text-xs text-indigo-400">{"// 404"}</div>
        <h1 className="font-pixel text-2xl sm:text-3xl mt-2">PAGE NOT FOUND</h1>
        <p className="text-sm text-zinc-400 mt-3">
          This route doesn&apos;t exist — but since you&apos;re here, feed the snake.
        </p>

        <NotFoundGame />

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            href="/home"
            className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            ▶ HOME
          </Link>
          <Link
            href="/matchmaking"
            className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
          >
            FIND A MATCH
          </Link>
        </div>
      </div>
    </div>
  );
}
