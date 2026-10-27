"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CardTile } from "@/components/CardTile";
import type { CardTileData } from "@/lib/cards";
import { getWishlist } from "@/lib/wishlist-client";

// The whole page is a client component: the wishlist lives in localStorage, so
// there is nothing useful to render on the server anyway (and CardTile only
// uses pure imports — games/format/card types — so it's safe to render here).
export default function WishlistPage() {
  // null = still loading; [] = genuinely empty.
  const [cards, setCards] = useState<CardTileData[] | null>(null);

  const loadFor = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      setCards([]);
      return;
    }
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        cache: "no-store",
      });
      const data = await res.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      setCards([]);
    }
  }, []);

  useEffect(() => {
    loadFor(getWishlist());
    // Live-update when a heart is toggled anywhere on the page.
    const onChange = () => {
      const ids = getWishlist();
      setCards((prev) => {
        // Optimistically drop removed cards immediately; refetch for additions.
        if (prev) {
          const keep = prev.filter((c) => ids.includes(c.id));
          if (keep.length !== ids.length) loadFor(ids);
          return keep;
        }
        loadFor(ids);
        return prev;
      });
    };
    window.addEventListener("wishlist-change", onChange);
    return () => window.removeEventListener("wishlist-change", onChange);
  }, [loadFor]);

  return (
    <div>
      <div className="card-surface mb-5 overflow-hidden">
        <div className="bg-gradient-to-r from-gold/15 via-ink-850 to-brand-600/20 p-6">
          <h1 className="text-2xl font-extrabold text-white">Your Wishlist</h1>
          <p className="mt-1 text-sm text-slate-300">
            Cards you&apos;re tracking, saved on this device. Open any card to set up a price-drop email alert.
          </p>
        </div>
      </div>

      {cards === null ? (
        <div className="flex justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-brand-400" />
        </div>
      ) : cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center">
          <p className="text-lg font-semibold text-white">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-slate-400">Tap the ♥ on any card to add it here and track its price.</p>
          <Link href="/browse" className="btn-primary mt-4">
            Browse cards
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
