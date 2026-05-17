"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import Avatar from "./Avatar";

export default function AuthNav() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);

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

  if (isPending) {
    return <span className="font-pixel text-[10px] text-zinc-600">···</span>;
  }

  if (data?.user) {
    const label = data.user.name ?? data.user.email.split("@")[0];
    const image = (data.user as { image?: string | null }).image ?? null;
    return (
      <div className="flex items-center gap-3 text-xs">
        {role === "admin" && (
          <Link href="/admin" className="font-pixel text-[10px] text-amber-300 hover:text-amber-200 border-2 border-amber-400 px-2 py-1 transition">
            ADMIN
          </Link>
        )}
        <Link
          href="/profile"
          className="flex items-center gap-2 text-zinc-300 hover:text-indigo-400 transition"
        >
          <Avatar src={image} name={label} size={24} frameSrc={frameSrc} />
          <span>{label}</span>
        </Link>
        <button
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
          className="font-pixel text-zinc-500 hover:text-fuchsia-400 transition"
        >
          EXIT
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5 text-xs font-pixel">
      <Link href="/login" className="text-zinc-400 hover:text-indigo-400 transition">
        CONTINUE
      </Link>
      <Link
        href="/signup"
        className="text-zinc-400 hover:text-indigo-400 transition"
      >
        NEW PLAYER
      </Link>
    </div>
  );
}
