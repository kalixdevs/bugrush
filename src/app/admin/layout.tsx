import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminGate";
import AuthNav from "@/components/AuthNav";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — Devrace" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/home");

  return (
    <div className="min-h-screen text-zinc-100 relative z-10 flex flex-col">
      <nav className="border-b-2 border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/home" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
            ← HOME
          </Link>
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">DEVRACE ADMIN</div>
          <AuthNav />
        </div>
      </nav>
      <div className="flex flex-1 min-h-0">
        <AdminSidebar />
        <main className="flex-1 px-8 py-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
