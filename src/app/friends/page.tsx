import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import FriendsHub from "@/components/friends/FriendsHub";

export const metadata = { title: "Friends — Bugrush" };

export default async function FriendsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/friends");
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// friends"}</div>
        <h1 className="font-pixel text-3xl mt-2">FRIENDS</h1>
      </div>
      <FriendsHub />
    </main>
  );
}
