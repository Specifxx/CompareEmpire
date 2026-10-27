"use client";

import { useEffect, useState } from "react";

// First-visit nudge teaching the heart-to-save flow. Dismissed permanently via
// localStorage, so returning visitors never see it. Renders nothing until mounted
// so it can't cause hydration mismatch or a flash for dismissed users.
const KEY = "dc_hint_save_dismissed";

export function BrowseHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode / storage blocked — just don't show */
    }
  }, []);

  if (!show) return null;

  return (
    <div className="reveal in-view mb-4 flex items-center gap-3 rounded-lg border border-ink-800 border-l-2 border-l-brand-500 bg-ink-900 px-4 py-3 text-sm">
      <span className="text-lg" aria-hidden>♥</span>
      <p className="flex-1 text-slate-300">
        Tap the <span className="font-semibold text-brand-300">heart</span> on any card to save it to your
        wishlist and get a price-drop alert when it gets cheaper.
      </p>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label="Dismiss tip"
      >
        Got it ✕
      </button>
    </div>
  );
}
