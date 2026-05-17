"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  badgeId: string;
  isShowcased: boolean;
};

export default function ShowcaseControls({ badgeId, isShowcased }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await fetch("/api/profile/showcase-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId: isShowcased ? null : badgeId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`font-pixel text-[9px] px-2 py-1 border-2 transition ${
        isShowcased
          ? "border-indigo-500 bg-indigo-500 text-zinc-950"
          : "border-zinc-700 text-zinc-400 hover:border-indigo-500 hover:text-indigo-400"
      }`}
    >
      {busy ? "···" : isShowcased ? "SHOWCASED ✓" : "▶ SHOWCASE"}
    </button>
  );
}
