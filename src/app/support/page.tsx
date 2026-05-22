import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Support — Bugrush" };

const SUPPORT_EMAIL = "kalixdevs@gmail.com";

export default function SupportPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 space-y-6">
      <PageHeader
        eyebrow="// support"
        title="CONTACT US"
        subtitle="Stuck on a bug, missing rewards, or want to report a player? Email us and we'll get back as soon as we can."
        align="center"
      />

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
  );
}
