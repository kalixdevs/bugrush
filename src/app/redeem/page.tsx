import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import RedeemForm from "@/components/redeem/RedeemForm";

export const metadata = { title: "Redeem — Bugrush" };

export default async function RedeemPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/redeem");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16 space-y-6">
      <div className="text-center">
        <div className="font-mono text-xs text-indigo-400 mb-3">{"// promo codes"}</div>
        <h1 className="font-pixel text-3xl">REDEEM A CODE</h1>
        <p className="text-zinc-400 text-sm mt-3">
          Got a code from an event or partner? Enter it here for coins or cosmetics.
        </p>
      </div>

      <RedeemForm />
    </main>
  );
}
