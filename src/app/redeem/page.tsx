import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import RedeemForm from "@/components/redeem/RedeemForm";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Redeem — Bugrush" };

export default async function RedeemPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/redeem");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16 space-y-6">
      <PageHeader
        eyebrow="// promo codes"
        title="REDEEM A CODE"
        subtitle="Got a code from an event or partner? Enter it here for coins or cosmetics."
        align="center"
      />

      <RedeemForm />
    </main>
  );
}
