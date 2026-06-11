"use client";

// localStorage-backed wishlist so it works without an account. Unlike
// dexcompare's cookie version, nothing server-side ever needs the ids here —
// the /wishlist page fetches tiles client-side via POST /api/cards — so
// localStorage (bigger quota, never sent with every request) is the better fit.
//
// Perf: the list is cached in memory so toggling doesn't re-parse storage, and
// the change event carries the affected id so only THAT button re-renders — not
// every wishlist button on the page (there can be hundreds in a long grid).
const KEY = "tpe_wishlist_v1";

let cache: string[] | null = null;

function load(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    // Storage blocked / corrupt JSON — start from an empty list.
    cache = [];
  }
  return cache;
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache ?? []));
  } catch {
    // Private mode / quota — the in-memory cache still works for this session.
  }
}

export function getWishlist(): string[] {
  return load().slice();
}

// Replace the whole list (handy if a signed-in sync is ever added).
export function setWishlist(ids: string[]): void {
  cache = Array.from(new Set(ids));
  persist();
  window.dispatchEvent(new CustomEvent("wishlist-change", { detail: { id: null } }));
}

export function isWishlisted(id: string): boolean {
  return load().includes(id);
}

export function toggleWishlist(id: string): boolean {
  const ids = load();
  const i = ids.indexOf(id);
  let nowOn: boolean;
  if (i >= 0) {
    ids.splice(i, 1);
    nowOn = false;
  } else {
    ids.unshift(id);
    nowOn = true;
  }
  persist();
  // Carry the changed id so listeners can skip work for unrelated cards.
  window.dispatchEvent(new CustomEvent("wishlist-change", { detail: { id } }));
  return nowOn;
}

export function wishlistCount(): number {
  return load().length;
}
