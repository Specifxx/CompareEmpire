// Which product a set page's price alert follows (2026-11-19, site loop Job C: the set pages are among Dex's most-read pages
// and had no alert of their own; a visitor had to open a product first). The set's booster box, else its Elite Trainer Box,
// else its booster bundle: the products people watch a set by. Within the type, one a store has open first, then the cheapest.
// A set with none of the three gets no alert (the products' own pages and quick view keep theirs). Pure: tests/set-alert.test.ts.
import type { ProductCardData } from "./data";
import { cardOpen } from "./compact";

export const SET_ALERT_TYPES = ["Booster Box", "Elite Trainer Box", "Booster Bundle"] as const;

const SHORT: Record<(typeof SET_ALERT_TYPES)[number], string> = {
  "Booster Box": "booster box",
  "Elite Trainer Box": "Elite Trainer Box",
  "Booster Bundle": "booster bundle",
};

type AlertCandidate = Pick<ProductCardData, "slug" | "name" | "productType" | "inStockStores" | "marketplaceOpen" | "lowestPriceCents">;

export function setAlertPick<T extends AlertCandidate>(products: readonly T[]): T | null {
  for (const type of SET_ALERT_TYPES) {
    const of = products.filter((p) => p.productType === type);
    if (!of.length) continue;
    return [...of].sort(
      (a, b) =>
        Number(cardOpen(b)) - Number(cardOpen(a)) ||
        (a.lowestPriceCents ?? Number.MAX_SAFE_INTEGER) - (b.lowestPriceCents ?? Number.MAX_SAFE_INTEGER) ||
        a.slug.localeCompare(b.slug),
    )[0];
  }
  return null;
}

/** The button's words: "Email me when the Delta Reign booster box drops" (or "…is in stock at my price" with no price today). */
export function setAlertLabel(setName: string, p: AlertCandidate, preorder = false): string {
  const what = `${setName} ${SHORT[p.productType as (typeof SET_ALERT_TYPES)[number]] ?? p.productType}`;
  // The pre-order page (2026-11-23): its prices are pre-orders, so the button says so.
  if (preorder) return p.lowestPriceCents == null || !cardOpen(p) ? `Email me when a ${what} pre-order opens at my price` : `Email me when the ${what} pre-order drops`;
  return p.lowestPriceCents == null || !cardOpen(p) ? `Email me when the ${what} is in stock at my price` : `Email me when the ${what} drops`;
}
