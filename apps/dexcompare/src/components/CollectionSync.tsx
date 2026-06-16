"use client";

import { useEffect, useRef } from "react";
import {
  getCollectionFull,
  replaceCollection,
  type CollectionEntry,
} from "@/lib/collection-client";

interface ServerItem {
  cardId: string;
  qty: number;
  costBasisCents: number | null;
  costCurrency: string | null;
}

// Keeps a signed-in user's collection (qty + cost basis) saved to their account
// (cross-device). On mount it merges the server-saved collection with the local
// localStorage collection and writes the merged set to both. Thereafter it
// debounce-saves every change to the server. Logged-out users are untouched
// (localStorage only). Renders nothing. Mirrors WishlistSync.
export function CollectionSync({ loggedIn }: { loggedIn: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;

    const save = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const full = getCollectionFull();
        const items = Object.entries(full).map(([cardId, v]) => ({
          cardId,
          qty: v.qty,
          costBasisCents: v.costBasisCents,
          costCurrency: v.costCurrency,
        }));
        fetch("/api/collection", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }).catch(() => {});
      }, 800);
    };

    // Merge server + local on sign-in, then persist the union both ways.
    // Merge rule: union by cardId; qty = max(local, server) — idempotent, never
    // doubles; cost basis = prefer the server value if present, else local.
    (async () => {
      try {
        const res = await fetch("/api/collection");
        const data = await res.json();
        if (cancelled) return;
        const local = getCollectionFull();
        const merged: Record<string, CollectionEntry> = {};
        for (const [id, v] of Object.entries(local)) merged[id] = { ...v };
        for (const s of (data.items ?? []) as ServerItem[]) {
          const l = merged[s.cardId];
          const hasServerBasis = s.costBasisCents != null && !!s.costCurrency;
          merged[s.cardId] = {
            qty: Math.max(l?.qty ?? 0, s.qty ?? 0),
            costBasisCents: hasServerBasis ? s.costBasisCents : l?.costBasisCents ?? null,
            costCurrency: hasServerBasis ? s.costCurrency : l?.costCurrency ?? null,
          };
        }
        replaceCollection(merged); // overwrite both local stores + notify readers
        save(); // push the merged set to the server
      } catch {
        /* ignore — local collection still works */
      }
    })();

    const onChange = () => save();
    window.addEventListener("collection-change", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("collection-change", onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loggedIn]);

  return null;
}
