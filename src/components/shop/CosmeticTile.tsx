"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PlayerName from "@/components/PlayerName";
import { RARITY_TONE, type Rarity, type CosmeticCategory } from "@/lib/cosmetics";

type Props = {
  loggedIn: boolean;
  previewName: string;
  cosmetic: {
    id: string;
    category: CosmeticCategory;
    name: string;
    description: string;
    rarity: Rarity;
    priceCoins: number | null;
    assetUrl: string | null;
    cssClass: string | null;
    textValue: string | null;
  };
  owned: boolean;
  equipped: boolean;
};

export default function CosmeticTile({
  loggedIn, previewName, cosmetic, owned, equipped,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tone = RARITY_TONE[cosmetic.rarity];

  const preview = (() => {
    if (cosmetic.category === "frame") {
      return <Avatar name={previewName} size={64} frameSrc={cosmetic.assetUrl} />;
    }
    if (cosmetic.category === "title") {
      return (
        <PlayerName
          name={previewName}
          title={cosmetic.textValue}
          className="font-medium"
        />
      );
    }
    return (
      <PlayerName
        name={previewName}
        nameEffectClass={cosmetic.cssClass}
        className="text-xl font-medium"
      />
    );
  })();

  const buy = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosmeticId: cosmetic.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch { setErr("failed"); } finally { setBusy(false); }
  };

  const equip = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cosmetic.category, cosmeticId: cosmetic.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch { setErr("failed"); } finally { setBusy(false); }
  };

  const unequip = async () => {
    setBusy(true);
    try {
      await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cosmetic.category, cosmeticId: null }),
      });
      router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className={`border-2 ${tone.border} bg-zinc-900 p-4 flex flex-col`}>
      <div className="h-24 grid place-items-center bg-zinc-950 border-2 border-zinc-800 mb-3">
        {preview}
      </div>
      <div className="font-pixel text-xs">{cosmetic.name}</div>
      <div className={`font-pixel text-[9px] mt-1 ${tone.text}`}>{tone.label}</div>
      <div className="text-xs text-zinc-500 mt-2 min-h-[2.5em]">{cosmetic.description}</div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {!loggedIn ? (
          <Link
            href="/login?next=/shop"
            className="font-pixel text-[10px] text-indigo-400 hover:text-indigo-300 transition"
          >
            LOG IN TO BUY
          </Link>
        ) : equipped ? (
          <>
            <span className="font-pixel text-[10px] text-indigo-400">EQUIPPED ✓</span>
            <button
              onClick={unequip}
              disabled={busy}
              className="font-pixel text-[10px] text-zinc-500 hover:text-fuchsia-400 transition"
            >
              UNEQUIP
            </button>
          </>
        ) : owned ? (
          <button
            onClick={equip}
            disabled={busy}
            className="btn-press w-full px-3 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            ▶ EQUIP
          </button>
        ) : (
          <button
            onClick={buy}
            disabled={busy}
            className="btn-press w-full px-3 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-amber-400 text-zinc-950"
          >
            ▶ BUY {cosmetic.priceCoins}
          </button>
        )}
      </div>

      {err && (
        <p className="text-[10px] text-fuchsia-400 font-mono mt-2">{err}</p>
      )}
    </div>
  );
}
