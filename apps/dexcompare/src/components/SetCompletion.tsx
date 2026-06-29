"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCollection } from "@/lib/collection-client";

// Set-page banner: how many of this set's cards are in the visitor's collection.
// Hidden until they own at least one, so it never nags new visitors.
export function SetCompletion({ cardIds, setName }: { cardIds: string[]; setName: string }) {
  const [owned, setOwned] = useState(0);

  useEffect(() => {
    const sync = () => {
      const col = getCollection();
      setOwned(cardIds.reduce((n, id) => n + (col[id] > 0 ? 1 : 0), 0));
    };
    sync();
    window.addEventListener("collection-change", sync);
    return () => window.removeEventListener("collection-change", sync);
  }, [cardIds]);

  if (owned === 0) return null;
  const pct = Math.round((owned / Math.max(cardIds.length, 1)) * 100);

  return (
    <div className="card-surface flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[200px] flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-white">
            Your {setName} collection: <span className="num">{owned}</span> of <span className="num">{cardIds.length}</span> cards
          </span>
          <span className="num text-sm font-bold text-brand-400">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Link href="/collection" className="btn-ghost shrink-0 text-xs">View my collection →</Link>
    </div>
  );
}
