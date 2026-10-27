"use client";

import { useState } from "react";
import { GAME_LIST, type GameKey } from "@/lib/games";
import { useGames } from "./GameProvider";

// First-visit onboarding: "Which TCGs do you play?" — a multi-select that
// personalises the homepage, browse defaults and search scope. Dismissable
// (skipping = all games); never shown again once a choice is saved.
export function GamePicker() {
  const { chosen, setGames } = useGames();
  const [picked, setPicked] = useState<Set<GameKey>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  if (chosen || dismissed) return null;

  function toggle(k: GameKey) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function save() {
    setGames(picked.size ? [...picked] : []);
    setDismissed(true);
  }

  function all() {
    setGames([]);
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Choose your games">
      <div className="card-surface w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-6 text-center">
          <div className="text-2xl">👑</div>
          <h2 className="mt-1 text-xl font-extrabold text-white">Which TCGs do you play?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Pick one or more — we&apos;ll tailor prices, search and the homepage to your games. Change it anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
          {GAME_LIST.map((g) => {
            const on = picked.has(g.key);
            return (
              <button
                key={g.key}
                onClick={() => toggle(g.key)}
                aria-pressed={on}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  on ? "border-brand-500 bg-brand-500/10" : "border-ink-700 bg-ink-900 hover:border-ink-600"
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">{g.short}</span>
                  <span className="block truncate text-[11px] text-slate-500">{g.tagline}</span>
                </span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${
                    on ? "border-brand-400 bg-brand-500 text-white" : "border-ink-600 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ink-700 bg-ink-900/40 px-5 py-4">
          <button onClick={all} className="text-sm font-medium text-slate-400 hover:text-white">
            Show me everything
          </button>
          <button onClick={save} disabled={picked.size === 0} className="btn-primary">
            {picked.size ? `Track ${picked.size} ${picked.size === 1 ? "game" : "games"}` : "Pick a game"}
          </button>
        </div>
      </div>
    </div>
  );
}
