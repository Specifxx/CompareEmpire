"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES, type GameKey } from "@/lib/games";
import { formatMoney } from "@/lib/format";

const KEY = "tpe_recent_v1";
const MAX = 12;

// One recently-viewed card. Self-contained (unlike dexcompare, which stores
// bare ids and refetches): everything the rail renders is captured at view
// time, so the strip needs zero network requests and works instantly.
export interface RecentEntry {
  slug: string;
  name: string;
  imageUrl: string | null;
  game: string;
  marketPriceCents: number | null;
  at: number; // Date.now() at view time
}

function loadEntries(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is RecentEntry => !!e && typeof e.slug === "string" && typeof e.name === "string");
  } catch {
    return [];
  }
}

// Record a card-page visit (called by RecordView). Most recent first, deduped
// by slug; re-visiting refreshes the stored snapshot (name/image/price).
export function recordRecentView(entry: Omit<RecentEntry, "at">) {
  try {
    const next = [{ ...entry, at: Date.now() }, ...loadEntries().filter((e) => e.slug !== entry.slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage blocked — recently-viewed just stays empty.
  }
}

// "Recently viewed" strip. Renders nothing until the visitor has opened some
// cards, so first-time visitors never see an empty section.
export function RecentlyViewed() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  if (entries.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-extrabold text-white">Recently viewed</h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {entries.map((e) => {
          const game = GAMES[e.game as GameKey];
          return (
            <Link
              key={e.slug}
              href={`/card/${e.slug}`}
              prefetch={false}
              className="group card-surface flex w-36 shrink-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow sm:w-44"
            >
              <div
                className="grid aspect-[5/7] w-full place-items-center overflow-hidden p-3"
                style={{
                  background: `radial-gradient(120% 80% at 50% 0%, ${game?.color ?? "#8b5cf6"}1f, transparent 60%)`,
                }}
              >
                {e.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt={e.name}
                    loading="lazy"
                    className="max-h-full max-w-full rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="px-2 text-center text-xs font-bold text-slate-600">{e.name}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 border-t border-ink-700 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white" title={e.name}>
                  {e.name}
                </h3>
                <div className="mt-auto flex items-end justify-between pt-1">
                  {e.marketPriceCents != null ? (
                    <span className="text-sm font-bold text-accent">{formatMoney(e.marketPriceCents, "USD")}</span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">Compare →</span>
                  )}
                  {game && (
                    <span className="text-[10px] font-semibold" style={{ color: game.color }}>
                      {game.short}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
