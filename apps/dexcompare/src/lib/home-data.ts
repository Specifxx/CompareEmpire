import { prisma } from "./db";
import { type Country } from "./country";
import { RETAILER_LIST } from "./retailers";

// The homepage's query stack, cached per market.
//
// This used to fetch four separate card rails (popular / valuable / cheapest /
// new sealed) to build one "Browse the card database" grid. That section was
// removed as redundant — the hero is already a search-first gateway to /browse —
// and with it every one of those queries became dead weight. What's left is two
// cheap COUNTs; the store count is derived from our own retailer config rather
// than aggregated out of the price table.
export interface HomeData {
  totalCards: number;
  inStockUnits: number;
  storeCount: number;
}

async function computeHomeData(country: Country): Promise<HomeData> {
  // How many stores we track in this market is a property of our CONFIG, not of
  // the price table — so it needs no query at all. This used to be a groupBy
  // scanning every RetailerPrice row (~68k) purely to read `.length` off it.
  const storeCount = RETAILER_LIST.filter((r) => (r.country ?? "AU") === country).length;

  const [totalCards, inStockUnits] = await Promise.all([
    // Deliberately UNFILTERED: the hero renders this as "Search N cards", and
    // search covers the whole catalogue, not just the priced part. Scoping it to
    // priced cards would read "Search 0 cards" any time the importer hasn't run.
    prisma.card.count(),
    prisma.retailerPrice.count({
      where: { country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
    }),
  ]);

  return { totalCards, inStockUnits, storeCount };
}

// In-process TTL memo keyed by market. unstable_cache silently no-ops above its
// 2 MB item limit, which would send EVERY homepage hit back to the DB; the
// globalThis memo is the egress-safe pattern this codebase mandates (see db.ts).
// At most one homepage query burst per market per warm instance per TTL.
type HomeMemo = Map<string, { at: number; data: HomeData }>;
const homeMemo: HomeMemo = ((globalThis as unknown as { __homeData?: HomeMemo }).__homeData ??= new Map());
const HOME_TTL_MS = 5 * 60_000;

export async function getHomeData(country: Country): Promise<HomeData> {
  const hit = homeMemo.get(country);
  if (hit && Date.now() - hit.at < HOME_TTL_MS) return hit.data;
  const data = await computeHomeData(country);
  homeMemo.set(country, { at: Date.now(), data });
  return data;
}
