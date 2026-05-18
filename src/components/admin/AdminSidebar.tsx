"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "DASHBOARD" },
  { href: "/admin/events", label: "EVENTS" },
  { href: "/admin/codes", label: "PROMO CODES" },
  { href: "/admin/cosmetics", label: "COSMETICS" },
  { href: "/admin/users", label: "USERS" },
  { href: "/admin/chat", label: "CHAT" },
  { href: "/admin/tournaments", label: "TOURNAMENTS" },
  { href: "/admin/announcement", label: "ANNOUNCEMENT" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 flex-shrink-0 border-r-2 border-zinc-800 bg-zinc-950 py-6">
      <div className="font-pixel text-[10px] text-zinc-500 tracking-widest px-4 mb-3">{"// admin"}</div>
      <nav className="flex flex-col">
        {LINKS.map((l) => {
          const active = l.href === "/admin"
            ? pathname === "/admin"
            : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 font-pixel text-xs border-l-4 transition ${
                active
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
