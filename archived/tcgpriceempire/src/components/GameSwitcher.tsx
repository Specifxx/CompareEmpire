"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_LIST, type GameKey } from "@/lib/games";
import { useGames } from "./GameProvider";

// Navbar control: shows how many games are selected and opens a checkbox list to
// change the selection — the post-onboarding way to retune "which games I play".
export function GameSwitcher({ className }: { className?: string }) {
  const { games, setGames } = useGames();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(k: GameKey) {
    const has = games.includes(k);
    // Never allow an empty selection — the last game stays on.
    if (has && games.length === 1) return;
    setGames(has ? games.filter((g) => g !== k) : [...games, k]);
  }

  const label = games.length === GAME_LIST.length ? "All games" : `${games.length} ${games.length === 1 ? "game" : "games"}`;

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-ink-800 hover:text-white"
      >
        <span aria-hidden>🎴</span>
        <span className="hidden sm:inline">{label}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            I play…
          </div>
          <div className="flex flex-col gap-0.5 p-1.5">
            {GAME_LIST.map((g) => {
              const on = games.includes(g.key);
              return (
                <button
                  key={g.key}
                  onClick={() => toggle(g.key)}
                  aria-pressed={on}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${on ? "bg-ink-800" : "hover:bg-ink-800"}`}
                >
                  <span className="text-base leading-none">{g.icon}</span>
                  <span className="flex-1 text-sm font-medium text-white">{g.short}</span>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-md border text-[10px] font-bold ${
                      on ? "border-brand-400 bg-brand-500 text-white" : "border-ink-600 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
