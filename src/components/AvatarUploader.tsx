"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

type Props = {
  initialSrc: string | null;
  name: string;
  frameSrc?: string | null;
};

export default function AvatarUploader({ initialSrc, name, frameSrc }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Max 2 MB.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "upload failed" }));
        setError(j.error ?? "upload failed");
        setBusy(false);
        return;
      }
      const data: { url: string } = await res.json();
      setSrc(data.url);
      router.refresh();
    } catch {
      setError("upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (!src) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        setError("could not remove");
        setBusy(false);
        return;
      }
      setSrc(null);
      router.refresh();
    } catch {
      setError("could not remove");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <Avatar src={src} name={name} size={80} frameSrc={frameSrc} />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onChange}
          hidden
        />
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className={`btn-press px-4 py-2 font-pixel text-[10px] border-2 border-zinc-950 ${
            busy ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
          }`}
        >
          {busy ? "···" : src ? "▶ CHANGE AVATAR" : "▶ UPLOAD AVATAR"}
        </button>
        {src && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="font-pixel text-[10px] text-zinc-500 hover:text-fuchsia-400 transition text-left"
          >
            REMOVE
          </button>
        )}
        {error && <p className="text-xs text-fuchsia-400 font-mono">{error}</p>}
        {!error && <p className="text-[10px] text-zinc-500 font-mono">PNG/JPG/WEBP/GIF · max 2 MB</p>}
      </div>
    </div>
  );
}
