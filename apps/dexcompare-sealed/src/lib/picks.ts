// The landing page's "Most stocked in <region> today" (components/HomeRegionGrid.tsx): ten in-stock (owner, 2026-11-13: more products on the landing page) products of one region, taken
// from the region home's newest booster boxes and Elite Trainer Boxes (data.ts homeRails, up to eight of each) and ordered by how
// price, dearest first (owner, 2026-11-12: lib/feature-floor.ts), then how many stores have them in stock, newest set first. Read by /api/picks/<region> and, for the default
// region, by the landing page itself, so the first paint is already filled.
import { homeRails } from "./data";
import { REGIONS, type Region } from "./regions";
import { featured } from "./feature-floor";

export interface Pick {
  slug: string;
  name: string;
  type: string;
  img: string | null;
  cents: number | null;
  stores: number;
  /** Independent stores that list it (in stock or not): "in stock at 12 of 15 stores". */
  listed: number;
  tcg: boolean;
  /** The median open store price (null under two stores). */
  median: number | null;
}

export const PICK_SLOTS = 10;

export async function regionPicks(region: Region): Promise<Pick[]> {
  const { boxes, etbs } = await homeRails(REGIONS[region].market);
  // Both lists come newest set first; a stable sort keeps that order among equals. Dearest first, topped up if short.
  const pool = featured([...boxes, ...etbs].sort((a, b) => b.inStockStores - a.inStockStores), REGIONS[region].market, (p) => p.lowestPriceCents, PICK_SLOTS, true).map((p) => ({ p }));
  return pool
    .map(({ p }) => ({ slug: p.slug, name: p.name, type: p.productType, img: p.imageUrl, cents: p.lowestPriceCents, stores: p.inStockStores, listed: Math.max(p.listedStores, p.inStockStores), tcg: p.marketplaceOpen, median: p.medianOpenCents }));
}
