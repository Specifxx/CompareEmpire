import { prisma } from "./db";
import { type Country } from "./country";

// The homepage's query stack, covering every market in one cached payload.
//
// This used to fetch four separate card rails (popular / valuable / cheapest /
// new sealed) to build one "Browse the card database" grid. That section was
// removed as redundant — the hero is already a search-first gateway to /browse —
// and with it every one of those queries became dead weight. What's left is one
// COUNT plus two small grouped aggregates.
export interface HomeData {
  totalCards: number;
  // Keyed by market: the hero is rendered in an ISR-cached, cookie-free page, so
  // the client island picks the visitor's market from these.
  inStockByMarket: Record<Country, number>;
  storeCountByMarket: Record<Country, number>;
}

async function computeHomeData(): Promise<HomeData> {
  // One grouped query each, rather than per-market round trips.
  //
  // storeCount is counted from LIVE LISTINGS, not from RETAILER_LIST. The config
  // counts integrations we've configured; ~15 of the 40 AU entries currently
  // return nothing at all (dead domains / moved platforms), so the config number
  // overstated the hero by 60%. Claiming stores we aren't actually pricing is the
  // kind of thing that erodes trust on a comparison site.
  const [totalCards, inStockRows, storeRows] = await Promise.all([
    // Deliberately UNFILTERED: the hero renders this as "Search N cards", and
    // search covers the whole catalogue, not just the priced part. Scoping it to
    // priced cards would read "Search 0 cards" any time the importer hasn't run.
    prisma.card.count(),
    prisma.retailerPrice.groupBy({
      by: ["country"],
      where: { inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
      _count: { _all: true },
    }),
    prisma.retailerPrice.groupBy({
      by: ["country", "retailer"],
      where: { inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
    }),
  ]);

  const inStockByMarket = { AU: 0, US: 0, GB: 0 } as Record<Country, number>;
  for (const r of inStockRows) {
    if (r.country in inStockByMarket) inStockByMarket[r.country as Country] = r._count._all;
  }
  const storeCountByMarket = { AU: 0, US: 0, GB: 0 } as Record<Country, number>;
  for (const r of storeRows) {
    if (r.country in storeCountByMarket) storeCountByMarket[r.country as Country] += 1;
  }

  return { totalCards, inStockByMarket, storeCountByMarket };
}

// In-process TTL memo. unstable_cache silently no-ops above its 2 MB item limit,
// which would send EVERY homepage hit back to the DB; the globalThis memo is the
// egress-safe pattern this codebase mandates (see db.ts). The payload covers all
// markets in one object, so this is a single entry rather than one per market.
type HomeMemo = { at: number; data: HomeData } | null;
const HOME_TTL_MS = 5 * 60_000;
const store = globalThis as unknown as { __homeData?: HomeMemo };

export async function getHomeData(): Promise<HomeData> {
  const hit = store.__homeData;
  if (hit && Date.now() - hit.at < HOME_TTL_MS) return hit.data;
  const data = await computeHomeData();
  store.__homeData = { at: Date.now(), data };
  return data;
}
