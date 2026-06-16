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

// ─── Cost basis ────────────────────────────────────────────────────────────────
// What you paid, stored ALONGSIDE the qty collection (separate key) so every
// existing collection reader — card buttons, set progress — stays untouched. Per
// card we keep the average unit cost in the currency it was entered in. P&L is
// only computed against the live price when that currency matches the viewer's
// market, so we never invent an FX rate for a number the user typed by hand.
const BASIS_KEY = "dex_cost_basis_v1";

export interface CostBasis {
  unitCents: number; // average paid per copy, in `currency`
  currency: string; // "AUD" | "NZD" | "USD" | "GBP"
}

let basisCache: Record<string, CostBasis> | null = null;

function loadBasis(): Record<string, CostBasis> {
  if (basisCache) return basisCache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BASIS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, CostBasis>) : {};
    basisCache = {};
    for (const [id, v] of Object.entries(parsed)) {
      const unit = Math.floor(Number(v?.unitCents));
      const cur = typeof v?.currency === "string" ? v.currency : "";
      if (id && cur && Number.isFinite(unit) && unit > 0) {
        basisCache[id] = { unitCents: Math.min(unit, 1_000_000_00), currency: cur };
      }
    }
  } catch {
    basisCache = {};
  }
  return basisCache!;
}

function persistBasis(changedId: string | null) {
  try {
    window.localStorage.setItem(BASIS_KEY, JSON.stringify(basisCache ?? {}));
  } catch {
    // Storage full/blocked — keep in-memory state so the session still works.
  }
  // Reuse the collection-change event so the portfolio view re-renders on edits.
  window.dispatchEvent(new CustomEvent("collection-change", { detail: { id: changedId } }));
}

// ─── Account sync ────────────────────────────────────────────────────────────
// A unified per-card view combining the qty store and the cost-basis store, used
// by CollectionSync to merge with the server and persist. Cost basis is flattened
// to (costBasisCents, costCurrency) so it round-trips through the API verbatim.
export interface CollectionEntry {
  qty: number;
  costBasisCents: number | null;
  costCurrency: string | null;
}

export function getCollectionFull(): Record<string, CollectionEntry> {
  const qtys = load();
  const bases = loadBasis();
  const out: Record<string, CollectionEntry> = {};
  // Union of both stores: a card may have a qty, a cost basis, or both.
  const ids = new Set([...Object.keys(qtys), ...Object.keys(bases)]);
  for (const id of ids) {
    const qty = qtys[id] ?? 0;
    const b = bases[id] ?? null;
    out[id] = {
      qty,
      costBasisCents: b ? b.unitCents : null,
      costCurrency: b ? b.currency : null,
    };
  }
  return out;
}

// Overwrite BOTH localStorage stores from a unified collection (used to apply the
// merged set on sign-in). Fires ONE collection-change event so readers re-render
// just once. Mirrors setWishlist's "replace the whole list" semantics.
export function replaceCollection(items: Record<string, CollectionEntry>): void {
  const nextQty: Record<string, number> = {};
  const nextBasis: Record<string, CostBasis> = {};
  for (const [id, v] of Object.entries(items)) {
    if (!id) continue;
    const n = Math.max(0, Math.min(9999, Math.floor(Number(v?.qty))));
    if (Number.isFinite(n) && n > 0) nextQty[id] = n;
    const unit = Math.floor(Number(v?.costBasisCents));
    const cur = typeof v?.costCurrency === "string" ? v.costCurrency : "";
    if (cur && Number.isFinite(unit) && unit > 0) {
      nextBasis[id] = { unitCents: Math.min(unit, 1_000_000_00), currency: cur };
    }
  }
  cache = nextQty;
  basisCache = nextBasis;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(nextQty));
    window.localStorage.setItem(BASIS_KEY, JSON.stringify(nextBasis));
  } catch {
    // Storage full/blocked — keep the in-memory state so the session still works.
  }
  window.dispatchEvent(new CustomEvent("collection-change", { detail: { id: null } }));
}

export function getCostBasis(id: string): CostBasis | null {
  return loadBasis()[id] ?? null;
}

export function getAllCostBases(): Record<string, CostBasis> {
  return { ...loadBasis() };
}

// Set (or clear, when unitCents is 0) the average paid price for a card. A blank
// currency is ignored — callers pass the market currency in effect at entry time.
export function setCostBasis(id: string, unitCents: number, currency: string): void {
  if (!currency) return;
  const map = loadBasis();
  const unit = Math.max(0, Math.min(1_000_000_00, Math.floor(unitCents)));
  if (unit === 0) delete map[id];
  else map[id] = { unitCents: unit, currency };
  persistBasis(id);
}
