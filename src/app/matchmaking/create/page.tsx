import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import AuthNav from "@/components/AuthNav";
import CreateMatchForm from "@/components/match/CreateMatchForm";

export const metadata = { title: "Create Match — Bugrush" };

export default async function CreateMatchPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/matchmaking/create");
  }

  return (
    <div className="min-h-screen text-zinc-100 relative z-10">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/matchmaking" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
            ← MATCHMAKING
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">CREATE MATCH</div>
          <AuthNav />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <CreateMatchForm />
      </main>
    </div>
  );
}
