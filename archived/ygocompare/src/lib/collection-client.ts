"use client";

// localStorage-backed collection tracker: cardId → quantity owned. Works without
// an account (same philosophy as the cookie wishlist, but localStorage because a
// collection can be hundreds of cards and cookies are sent on every request).
//
// Perf mirrors wishlist-client: parsed once into memory, and the change event
// carries the affected id so only that card's button re-renders.
const KEY = "dex_collection_v1";

let cache: Record<string, number> | null = null;

function load(): Record<string, number> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    cache = {};
    for (const [id, q] of Object.entries(parsed)) {
      const n = Math.floor(Number(q));
      if (id && Number.isFinite(n) && n > 0) cache[id] = Math.min(n, 9999);
    }
  } catch {
    cache = {};
  }
  return cache!;
}

function persist(changedId: string | null) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
  } catch {
    // Storage full/blocked — keep the in-memory state so the session still works.
  }
  window.dispatchEvent(new CustomEvent("collection-change", { detail: { id: changedId } }));
}

export function getCollection(): Record<string, number> {
  return { ...load() };
}

export function getQty(id: string): number {
  return load()[id] ?? 0;
}

export function setQty(id: string, qty: number): number {
  const col = load();
  const n = Math.max(0, Math.min(9999, Math.floor(qty)));
  if (n === 0) delete col[id];
  else col[id] = n;
  persist(id);
  return n;
}

export function addQty(id: string, delta: number): number {
  return setQty(id, getQty(id) + delta);
}

// Distinct cards owned.
export function collectionSize(): number {
  return Object.keys(load()).length;
}

// Total copies across all cards.
export function collectionTotalQty(): number {
  return Object.values(load()).reduce((s, q) => s + q, 0);
}
