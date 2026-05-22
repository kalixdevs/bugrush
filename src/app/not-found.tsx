import Link from "next/link";
import HideChrome from "@/components/HideChrome";

export const metadata = { title: "Not found — Bugrush" };

/** Branded 404 for any unmatched route. */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-6 text-zinc-100">
      <HideChrome />
      <div className="w-full max-w-md border-2 border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="font-mono text-xs text-indigo-400">{"// 404"}</div>
        <h1 className="font-pixel text-3xl mt-3">PAGE NOT FOUND</h1>
        <p className="text-sm text-zinc-400 mt-4">
          This route doesn&apos;t exist — it may have moved, or never did.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
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
