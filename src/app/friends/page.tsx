import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import FriendsHub from "@/components/friends/FriendsHub";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Friends — Bugrush" };

export default async function FriendsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?next=/friends");
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <PageHeader eyebrow="// friends" title="FRIENDS" />
      <FriendsHub />
    </main>
  );
}
