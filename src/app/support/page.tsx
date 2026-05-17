import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export const metadata = { title: "Support — Bugrush" };

const SUPPORT_EMAIL = "kalixdevs@gmail.com";

export default function SupportPage() {
  return (
    <div className="min-h-screen text-zinc-100">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/home" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
            ← HOME
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">SUPPORT</div>
          <AuthNav />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
        <div className="text-center">
          <div className="font-mono text-xs text-indigo-400 mb-3">{"// support"}</div>
          <h1 className="font-pixel text-3xl">CONTACT US</h1>
          <p className="text-zinc-400 text-sm mt-3">
            Stuck on a bug, missing rewards, or want to report a player? Email us and
            we&apos;ll get back as soon as we can.
          </p>
        </div>

        <div className="border-2 border-zinc-800 bg-zinc-900 p-6 text-center">
          <div className="font-pixel text-[10px] text-zinc-500 tracking-widest mb-2">EMAIL</div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-mono text-lg text-indigo-300 hover:text-indigo-200 transition break-all"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <p className="text-zinc-500 text-xs font-mono text-center">
          Include your handle and a short description. Screenshots help.
        </p>
      </main>
    </div>
  );
}
