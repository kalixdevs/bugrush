"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeHandle } from "@/lib/handle";

type Props = {
  initialHandle: string;
  initialName: string;
};

export default function ProfileEditor({ initialHandle, initialName }: Props) {
  const router = useRouter();
  const [handle, setHandle] = useState(initialHandle);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    normalizeHandle(handle) !== initialHandle.toLowerCase() ||
    name.trim() !== initialName.trim();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    const payload: { handle?: string; name?: string } = {};
    const normHandle = normalizeHandle(handle);
    if (normHandle !== initialHandle.toLowerCase()) payload.handle = normHandle;
    if (name.trim() !== initialName.trim()) payload.name = name.trim();

    try {
      const res = await fetch("/api/profile/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "save failed" }));
        setError(j.error ?? "save failed");
        setBusy(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-2 border-zinc-800 bg-zinc-900 p-6">
      <div className="font-pixel text-xs text-indigo-400 mb-4">EDIT PROFILE</div>

      <label className="block mb-4">
        <span className="block font-pixel text-[10px] text-zinc-400 mb-2">HANDLE</span>
        <div className="flex items-stretch border-2 border-zinc-800 bg-zinc-950">
          <span className="px-3 py-2 text-zinc-500 font-mono text-sm bg-zinc-900 border-r-2 border-zinc-800">
            /u/
          </span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            maxLength={20}
            className="flex-1 px-3 py-2 bg-zinc-950 text-zinc-100 font-mono focus:outline-none"
          />
        </div>
        <span className="block text-[10px] text-zinc-500 mt-1 font-mono">
          3–20 chars · a–z · 0–9 · _ -
        </span>
      </label>

      <label className="block mb-4">
        <span className="block font-pixel text-[10px] text-zinc-400 mb-2">DISPLAY NAME</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
        />
      </label>

      {error && <p className="text-xs text-fuchsia-400 font-mono mb-3">{error}</p>}
      {saved && !error && (
        <p className="text-xs text-indigo-400 font-mono mb-3">SAVED ✓</p>
      )}

      <button
        type="submit"
        disabled={!dirty || busy}
        className={`btn-press px-5 py-2 font-pixel text-[10px] border-2 border-zinc-950 ${
          dirty && !busy
            ? "bg-indigo-500 text-zinc-950"
            : "bg-zinc-800 text-zinc-500"
        }`}
      >
        {busy ? "···" : "▶ SAVE"}
      </button>
    </form>
  );
}
