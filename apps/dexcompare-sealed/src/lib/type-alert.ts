// Which product a type page's price alert follows (2026-11-20, site loop Job C: the type pages, /<region>/type/booster-boxes,
// elite-trainer-boxes, booster-bundles, are among Dex's most-read pages, ~500 views each in 28 days, and had no alert; a visitor
// had to open a product first). The type's product most likely to earn, by the home ranking (lib/home-rank.ts: views and buy
// clicks from data/demand.json times stock and price): an open one first, else a sold-out one ("in stock at my price").
// Pure apart from the ranking passed in: tests/type-alert.test.ts.
import type { ProductCardData } from "./data";
import { cardOpen } from "./compact";

type AlertCandidate = Pick<ProductCardData, "slug" | "name" | "productType" | "inStockStores" | "marketplaceOpen" | "lowestPriceCents">;

export function typeAlertPick<T extends AlertCandidate>(open: readonly T[], sold: readonly T[], rank: (xs: readonly T[]) => readonly T[]): T | null {
  const o = open.filter(cardOpen);
  return (o.length ? rank(o)[0] : rank(sold)[0]) ?? null;
}

/** The button's words: "Email me when the Delta Reign Booster Box drops" (or "…is in stock at my price" with no price today). */
export function typeAlertLabel(p: AlertCandidate): string {
  return p.lowestPriceCents == null || !cardOpen(p) ? `Email me when the ${p.name} is in stock at my price` : `Email me when the ${p.name} drops`;
}
