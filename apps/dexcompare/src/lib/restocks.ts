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
}

export const FEATURED_RESTOCKS: FeaturedRestock[] = [
  {
    slug: "chaos-rising",
    name: "Pokémon TCG: Mega Evolution — Chaos Rising",
    shortName: "Chaos Rising",
    series: "Mega Evolution",
    releaseDate: "2026-05-22",
    blurb:
      "The Mega Evolution — Chaos Rising expansion sold out within minutes of release and is out of stock across most retailers. This free tracker shows which stores have Booster Boxes, Elite Trainer Boxes and packs in stock right now — and emails you the moment any of them restock.",
    match: "chaos\\s*rising",
    ebayQuery: "Pokemon Mega Evolution Chaos Rising sealed",
    image: null,
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
