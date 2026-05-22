"use client";

import { useEffect } from "react";
import Link from "next/link";
import HideChrome from "@/components/HideChrome";

/**
 * Route-segment error boundary. Catches any uncaught error thrown while
 * rendering a page and shows a branded screen — never a raw stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged to the browser console only; the user never sees the detail.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] grid place-items-center px-6 text-zinc-100">
      <HideChrome />
      <div className="w-full max-w-md border-2 border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="font-mono text-xs text-fuchsia-400">{"// error"}</div>
        <h1 className="font-pixel text-2xl mt-3">SOMETHING BROKE</h1>
        <p className="text-sm text-zinc-400 mt-4">
          An unexpected error hit this page. The crash has been logged — try again,
          or head back home.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-zinc-600 mt-3">
            ref: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            ▶ TRY AGAIN
          </button>
          <Link
            href="/home"
            className="btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
          >
            HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
