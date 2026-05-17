"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import Avatar from "./Avatar";

export default function AuthNav() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.user) return;
    let cancelled = false;
    fetch("/api/me/role").then((r) => r.json()).then((j) => {
      if (cancelled) return;
      setRole(j.role ?? null);
      setFrameSrc(j.frameSrc ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [data?.user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) {
    return <span className="font-pixel text-[10px] text-zinc-600">···</span>;
  }

  if (!data?.user) {
    return (
      <div className="flex items-center gap-5 text-xs font-pixel">
        <Link href="/login" className="text-zinc-400 hover:text-indigo-400 transition">
          CONTINUE
        </Link>
        <Link href="/signup" className="text-zinc-400 hover:text-indigo-400 transition">
          NEW PLAYER
        </Link>
      </div>
    );
  }

  const label = data.user.name ?? data.user.email.split("@")[0];
  const image = (data.user as { image?: string | null }).image ?? null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar src={image} name={label} size={28} frameSrc={frameSrc} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
          <path d={open ? "M1 7l4-4 4 4z" : "M1 3l4 4 4-4z"} />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 border-2 border-zinc-800 bg-zinc-900 shadow-xl z-50"
        >
          <div className="px-3 py-3 border-b-2 border-zinc-800 flex items-center gap-2">
            <Avatar src={image} name={label} size={32} frameSrc={frameSrc} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100 truncate">{label}</div>
              {role === "admin" && (
                <div className="text-[10px] font-pixel tracking-widest text-purple-400">ADMIN</div>
              )}
            </div>
          </div>
          <div className="flex flex-col py-1">
            {role === "admin" && (
              <MenuLink href="/admin" icon="⚙" label="Admin" onClick={() => setOpen(false)} accent="amber" />
            )}
            <MenuLink href="/profile" icon="⚙" label="Settings" onClick={() => setOpen(false)} />
            <MenuLink href="/redeem" icon="🎟" label="Codes" onClick={() => setOpen(false)} />
            <MenuLink href="/support" icon="🎧" label="Support" onClick={() => setOpen(false)} />
            <div className="border-t-2 border-zinc-800 mt-1 pt-1">
              <button
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  router.refresh();
                }}
                className="w-full text-left px-3 py-2 text-sm text-fuchsia-400 hover:bg-zinc-950 hover:text-fuchsia-300 transition flex items-center gap-2"
              >
                <span aria-hidden>↩</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href, icon, label, onClick, accent,
}: {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
  accent?: "amber";
}) {
  const colorCls = accent === "amber"
    ? "text-amber-300 hover:text-amber-200"
    : "text-zinc-200 hover:text-indigo-300";
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={`px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-950 transition ${colorCls}`}
    >
      <span aria-hidden className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
