// "Other <type> in <region>" on a product page (2026-11-14): the products of the same type nearest to this one, as plain links.
//
// Why: a type hub shows its 48 cheapest in-stock products, a set hub its own set, and "More from <set>" the same set again. A local
// crawl of the 1,842 sitemap URLs found 339 of the 850 listed product pages with five or fewer pages linking them and 133 with three
// or fewer (collections, tins, Japanese boxes, decks: types with more products than their hub shows). Linking every product to the
// newest or the cheapest of its type would only add links to the pages that already have the most.
//
// So the type's products a visitor can buy today on an indexable page stand in ONE fixed order (release date, then slug: a booster
// box sits between the sets released before and after it) and each page links the few on either side of it. At either end the
// window slides inward instead of wrapping: the newest set's box links the six sets before it, never a 2014 box. Every such
// product of a type with more than NEIGHBOURS of them is then linked from at least NEIGHBOURS / 2 other product pages (the two
// ends) and from NEIGHBOURS in the middle, and a page's list changes only when a neighbour sells out or comes back. Thin pages
// (noindex, lib/index-tiers.ts) and sold-out products are never linked from here. Pure: tests/type-neighbours.test.ts.
import { cardOpen } from "./compact";
import type { ProductCardData } from "./data";
import { productNoindex } from "./index-tiers";

/** Links per page: this many on each side would be half of it. */
export const NEIGHBOURS = 6;

/** The order: oldest release first, products with no dated set first of all, then by slug. Stable from one import to the next. */
const inOrder = (a: Pick<ProductCardData, "releaseDate" | "slug">, b: Pick<ProductCardData, "releaseDate" | "slug">): number =>
  (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "") || a.slug.localeCompare(b.slug);

/**
 * The same-type products a product page links: up to `take` of the type's open, indexable products around `self` in the order,
 * oldest first. `rows` is the type's products in one market; `self` need not be among them (a thin or sold-out page still links
 * its neighbours, it is just not linked back).
 */
export function typeNeighbours<T extends ProductCardData>(self: Pick<ProductCardData, "slug" | "releaseDate">, rows: readonly T[], take = NEIGHBOURS): T[] {
  const line = rows.filter((p) => p.slug !== self.slug && cardOpen(p) && p.lowestPriceCents != null && !productNoindex(p, p.productType)).sort(inOrder);
  if (line.length <= take) return line;
  // Where `self` would stand: before the first product that sorts after it. The window is `take` wide around that gap, slid
  // inward at either end of the order.
  const at = line.findIndex((p) => inOrder(p, self) > 0);
  const gap = at === -1 ? line.length : at;
  const start = Math.max(0, Math.min(gap - Math.floor(take / 2), line.length - take));
  return line.slice(start, start + take);
}
