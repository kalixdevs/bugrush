import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import CreateMatchForm from "@/components/match/CreateMatchForm";

export const metadata = { title: "Create Match — Bugrush" };

export default async function CreateMatchPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/matchmaking/create");
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <CreateMatchForm />
    </main>
  );
}
