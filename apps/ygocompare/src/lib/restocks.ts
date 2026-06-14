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
  "Structure Deck",
]);

export function isHeadlineType(productType: string): boolean {
  return HEADLINE_TYPES.has(productType);
}

export const FEATURED_RESTOCKS: FeaturedRestock[] = [
  {
    slug: "25th-anniversary-rarity-collection",
    name: "Yu-Gi-Oh!: 25th Anniversary Rarity Collection",
    shortName: "Rarity Collection",
    series: "Rarity Collection",
    releaseDate: "2023-09-08",
    blurb:
      "The 25th Anniversary Rarity Collection is the most chased sealed product in modern Yu-Gi-Oh!, packed with Quarter Century Secret Rares. This tracker watches specialist stores, shows which have boxes in stock right now, logs every restock, and emails you the second product is back in your market.",
    match: "rarity\\s*collection|RA0",
    ebayQuery: "Yugioh 25th Anniversary Rarity Collection booster box sealed",
    image: null,
    setCode: "RA01", setName: "25th Anniversary Rarity Collection",
  },
  {
    slug: "supreme-darkness",
    name: "Yu-Gi-Oh!: Supreme Darkness",
    shortName: "Supreme Darkness",
    series: "Core Set",
    releaseDate: "2025-01-17",
    blurb:
      "Supreme Darkness is a hot recent core set with several meta-relevant chase cards. This tracker watches stores for Booster Box stock and emails you the moment it's back.",
    match: "supreme\\s*darkness|SUDA",
    ebayQuery: "Yugioh Supreme Darkness booster box sealed",
    image: null,
    setCode: "SUDA", setName: "Supreme Darkness",
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
