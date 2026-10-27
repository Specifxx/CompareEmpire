// Featured "restock tracker" products — hyped, frequently-sold-out sealed product
// that drives high-intent search + Reddit traffic. Each entry gets a tracker page
// at /restock/<slug> showing live in-stock status across the stores we scrape,
// plus an email "tell me when it restocks" signup. Add a new entry per hot drop
// (e.g. the 30th-anniversary Celebration set) — no other code changes needed.
//
// This module is PURE config (no DB / no server-only imports) so it's safe to
// import from client components too.

export interface FeaturedRestock {
  slug: string; // URL key, e.g. "chaos-rising"
  name: string; // full product name
  shortName: string; // compact name for chips/buttons
  series: string; // e.g. "Mega Evolution"
  releaseDate: string; // ISO date
  blurb: string; // one-paragraph description for the page + meta
  // Case-insensitive matcher run against a SealedListing.title to find this
  // product's listings across stores. Keep it specific (the set name).
  match: string; // a regex SOURCE string (so config stays JSON-ish/serialisable)
  // eBay search query used for the always-available secondary-market link.
  ebayQuery: string;
  image: string | null;
  // Optional: the set's code + name in our card DB, so we can offer the
  // "just want the chase single?" link into the comparison engine. Leave unset
  // until the set's singles are in the catalogue.
  setCode?: string;
  setName?: string;
  // Optional CONFIRMED RRP (recommended retail) per product type, per market, in
  // minor units (cents). Leave a market/type out when you don't have a verified
  // number — the page never fabricates an RRP, it just omits the "vs RRP" line.
  rrp?: Partial<Record<string, Partial<Record<string, number>>>>; // rrp[market][productType] = cents
}

// Product types treated as the "headline" SKUs — only these drive the page's
// in-stock STATUS and fire restock alert emails. A single $9 sleeved booster or
// loose pack being in stock should NOT scream "in stock now" or email everyone.
export const HEADLINE_TYPES = new Set<string>([
  "Booster Box",
  "Booster Case",
  "Starter Deck",
]);

export function isHeadlineType(productType: string): boolean {
  return HEADLINE_TYPES.has(productType);
}

export const FEATURED_RESTOCKS: FeaturedRestock[] = [
  {
    slug: "a-fist-of-divine-speed",
    name: "One Piece Card Game — A Fist of Divine Speed (OP11)",
    shortName: "OP11",
    series: "Booster",
    releaseDate: "2025-05-30",
    blurb:
      "OP11 — A Fist of Divine Speed sells out fast at most retailers. This tracker watches specialist game stores, shows which have Booster Boxes in stock right now, logs every restock as it happens, and emails you the second a box is back in your market.",
    match: "fist\\s*of\\s*divine\\s*speed|OP11",
    ebayQuery: "One Piece OP11 A Fist of Divine Speed booster box sealed",
    image: null,
    setCode: "OP11", setName: "A Fist of Divine Speed",
  },
  {
    slug: "emperors-in-the-new-world",
    name: "One Piece Card Game — Emperors in the New World (OP09)",
    shortName: "OP09",
    series: "Booster",
    releaseDate: "2024-11-22",
    blurb:
      "OP09 — Emperors in the New World is one of the most chased sets, home to the Shanks and Kaido leaders. This tracker watches stores for Booster Box stock and emails you the moment it's back.",
    match: "emperors\\s*in\\s*the\\s*new\\s*world|OP09",
    ebayQuery: "One Piece OP09 Emperors in the New World booster box sealed",
    image: null,
    setCode: "OP09", setName: "Emperors in the New World",
  },
];

export function getFeaturedRestock(slug: string): FeaturedRestock | undefined {
  return FEATURED_RESTOCKS.find((r) => r.slug === slug);
}

export function getFeaturedRestockSlugs(): string[] {
  return FEATURED_RESTOCKS.map((r) => r.slug);
}

// Compiled matcher for a featured product's store-title matching.
export function restockTitleRegex(r: FeaturedRestock): RegExp {
  return new RegExp(r.match, "i");
}

// Confirmed RRP (cents) for a product type in a market, or null when unknown.
export function rrpFor(r: FeaturedRestock, market: string, productType: string): number | null {
  return r.rrp?.[market]?.[productType] ?? null;
}
