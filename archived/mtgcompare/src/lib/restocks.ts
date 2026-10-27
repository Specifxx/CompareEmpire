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
  "Play Booster Box",
  "Collector Booster Box",
  "Booster Box",
  "Bundle",
  "Commander Deck",
]);

export function isHeadlineType(productType: string): boolean {
  return HEADLINE_TYPES.has(productType);
}

export const FEATURED_RESTOCKS: FeaturedRestock[] = [
  {
    slug: "final-fantasy",
    name: "Magic: The Gathering — Final Fantasy",
    shortName: "Final Fantasy",
    series: "Universes Beyond",
    releaseDate: "2025-06-13",
    blurb:
      "The Final Fantasy Universes Beyond set is the most in-demand Magic release in years — Play and Collector Booster boxes sell out within minutes at most retailers. This tracker watches dozens of specialist game stores, shows which have boxes and bundles in stock right now, logs every restock as it happens, and emails you the second product is back.",
    match: "final\\s*fantasy",
    ebayQuery: "MTG Final Fantasy sealed booster box",
    image: null,
    setCode: "fin",
    setName: "Final Fantasy",
  },
  {
    slug: "modern-horizons-3",
    name: "Magic: The Gathering — Modern Horizons 3",
    shortName: "Modern Horizons 3",
    series: "Modern Horizons",
    releaseDate: "2024-06-14",
    blurb:
      "Modern Horizons 3 is the format-defining draft set everyone wants a case of. This tracker watches specialist stores for Play and Collector Booster boxes, logs every restock, and emails you the moment product is back in stock in your market.",
    match: "modern\\s*horizons\\s*3",
    ebayQuery: "MTG Modern Horizons 3 sealed booster box",
    image: null,
    setCode: "mh3",
    setName: "Modern Horizons 3",
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
