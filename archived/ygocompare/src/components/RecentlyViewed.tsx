"use client";

import { useEffect, useState } from "react";
import { CardTile, type CardTileData } from "./CardTile";

const KEY = "dex_recent_v1";
const MAX = 12;

// Record a card-page visit (called by CardViewBeacon). Most recent first, deduped.
export function recordRecentView(cardId: string) {
  try {
    const raw = window.localStorage.getItem(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = [cardId, ...ids.filter((id) => id !== cardId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage blocked — recently-viewed just stays empty.
  }
}

// Homepage "Recently viewed" strip. Renders nothing until the visitor has opened
// some cards, so first-time visitors never see an empty section.
export function RecentlyViewed() {
  const [cards, setCards] = useState<CardTileData[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try {
      const raw = window.localStorage.getItem(KEY);
      ids = raw ? JSON.parse(raw) : [];
    } catch {
      return;
    }
    if (!Array.isArray(ids) || ids.length === 0) return;
    fetch(`/api/cards?ids=${ids.slice(0, MAX).join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.cards?.length && setCards(d.cards))
      .catch(() => {});
  }, []);

  if (cards.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-extrabold text-white">Recently viewed</h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {cards.map((c) => (
          <div key={c.id} className="w-36 shrink-0 sm:w-44">
            <CardTile card={c} />
          </div>
        ))}
      </div>
    </section>
  );
}
