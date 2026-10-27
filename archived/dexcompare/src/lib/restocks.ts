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
  "Elite Trainer Box",
  "Collection Box",
  "Bundle",
]);

export function isHeadlineType(productType: string): boolean {
  return HEADLINE_TYPES.has(productType);
}

export const FEATURED_RESTOCKS: FeaturedRestock[] = [
  {
    slug: "chaos-rising",
    name: "Pokémon TCG: Mega Evolution — Chaos Rising",
    shortName: "Chaos Rising",
    series: "Mega Evolution",
    releaseDate: "2026-05-22",
    blurb:
      "Mega Evolution — Chaos Rising sold out within minutes of release and is gone from most retailers. This tracker watches dozens of specialist TCG stores (the ones the camping crowd ignores), shows which have Booster Boxes and Elite Trainer Boxes in stock right now, logs every restock as it happens, and emails you the second a box is back.",
    match: "chaos\\s*rising",
    ebayQuery: "Pokemon Mega Evolution Chaos Rising sealed",
    image: null,
    // Fill setCode/setName once Chaos Rising singles are confirmed in the DB; the
    // "chase single" CTA appears automatically when these are set.
    // setCode: "me4", setName: "Chaos Rising",
    // RRP intentionally omitted — we don't fabricate it. Add verified numbers like:
    //   rrp: { AU: { "Booster Box": 24900, "Elite Trainer Box": 8900 } }
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
