// Which products the front pages FEATURE (owner, 2026-11-12: "promote the more expensive items, so we get more commission"). A cheap
// product stays listed, searchable and linkable; it just is not a headline on the landing page, the region home's hero, deals rail or
// TCGplayer banner. Pure, so tests/feature-floor.test.ts checks the rule without a render. It never touches a product's store rows
// (those stay price-ordered) and never reads a commission rate.
import { roughUsdCents } from "./sealed-title";

/**
 * US$100 (DECISIONS.md, 2026-11-12). From the US in-stock prices of 2026-11-12: the median product is $53, the top quartile starts at
 * $140, booster boxes sit at a $460 median, Elite Trainer Boxes $155, Pokémon Center ETBs $250 and cases from $1,200, while booster
 * bundles ($70), Build & Battle boxes, tins ($42), decks, blisters and packs are all under $100. So $100 keeps boxes, ETBs, cases and
 * Ultra-Premium Collections and drops the cheap tail. Other markets compare through sealed-title.ts's rough exchange table.
 */
export const FEATURE_MIN_USD_CENTS = 10_000;

/** Is this price (in `market`'s own currency) high enough to feature? */
export function featureWorthy(cents: number | null | undefined, market: string): boolean {
  return !!cents && roughUsdCents(cents, market) >= FEATURE_MIN_USD_CENTS;
}

/** The dearest first (compared in rough US dollars), ties keeping their given order. */
export function priciestFirst<T>(items: readonly T[], market: string, price: (t: T) => number | null | undefined): T[] {
  return items
    .map((t, i) => ({ t, i, usd: roughUsdCents(price(t) ?? 0, market) }))
    .sort((a, b) => b.usd - a.usd || a.i - b.i)
    .map((x) => x.t);
}

/** Only the featurable items, dearest first, at most `take`. With `fallback`, a short list is topped up from the rest (dearest first) so a hero is never empty. */
export function featured<T>(items: readonly T[], market: string, price: (t: T) => number | null | undefined, take: number, fallback = false): T[] {
  const ranked = priciestFirst(items, market, price);
  const good = ranked.filter((t) => featureWorthy(price(t), market));
  return (fallback ? [...good, ...ranked.filter((t) => !good.includes(t))] : good).slice(0, take);
}
