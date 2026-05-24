"use client";

import { useEffect, useState } from "react";

/**
 * Renders a themed title bar (drag region + min/max/close) when the app is
 * running inside the Tauri desktop client. In a regular browser this returns
 * null so nothing changes for web visitors. Detection: presence of
 * `__TAURI_INTERNALS__` injected by the Tauri runtime.
 */
export default function TauriTitleBar() {
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const detected = "__TAURI_INTERNALS__" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInTauri(detected);
    if (detected) document.body.classList.add("tauri-window");
    return () => { document.body.classList.remove("tauri-window"); };
  }, []);

  if (!inTauri) return null;

  const call = async (action: "minimize" | "toggleMax" | "close") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      if (action === "minimize") await w.minimize();
      else if (action === "toggleMax") await w.toggleMaximize();
      else await w.close();
    } catch (e) {
      console.error("[tauri] window control failed", e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 shrink-0 bg-zinc-950 border-b-2 border-zinc-800 flex items-stretch justify-between select-none"
    >
      <div
        data-tauri-drag-region
        className="flex items-center px-4 pointer-events-none"
      >
        <span className="font-pixel text-[10px] text-indigo-400 tracking-widest">
          ▶ BUGRUSH
        </span>
      </div>
      <div className="flex items-stretch">
        <CtrlButton label="minimize" onClick={() => call("minimize")}>
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
            <rect x="1" y="5" width="8" height="1.2" fill="currentColor" />
          </svg>
        </CtrlButton>
        <CtrlButton label="maximize" onClick={() => call("toggleMax")}>
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
            <rect
              x="1.4" y="1.4" width="7.2" height="7.2"
              fill="none" stroke="currentColor" strokeWidth="1.2"
            />
          </svg>
        </CtrlButton>
        <CtrlButton label="close" onClick={() => call("close")} danger>
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true">
            <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </CtrlButton>
      </div>
    </div>
  );
}

function CtrlButton({
  label, onClick, children, danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const hoverCls = danger
    ? "hover:bg-fuchsia-500 hover:text-zinc-950"
    : "hover:bg-zinc-800 hover:text-zinc-100";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`w-11 grid place-items-center text-zinc-400 transition ${hoverCls}`}
    >
      {children}
    </button>
  );
}
