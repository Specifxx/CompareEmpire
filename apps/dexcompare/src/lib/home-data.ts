import { prisma } from "./db";
import { getCheapestCards, getValuableCards } from "./cheapest-cards";
import { getPopularCards } from "./cards";
import { getNewSealedArrivals, type SealedGroup } from "./sealed-import";
import { priceField, type Country } from "./country";
import type { CardTileData } from "@/components/CardTile";

// The homepage's whole query stack, cached per market. The page is per-request
// (it reads the country cookie), which made every visit pay ~10 DB queries —
// PageSpeed measured ~1.5s of document latency from it. Prices only move on
// the imports, so a 5-minute cache makes TTFB a cache read without changing
// anything a visitor could notice.
export interface HomeData {
  totalCards: number;
  pricedCards: number;
  inStockUnits: number;
  cheapestCards: CardTileData[];
  valuableCards: CardTileData[];
  storeCount: number;
  popularCards: CardTileData[];
  // The shoppable marketplace grid on the homepage: a deduped blend of the
  // popular/valuable/cheapest arrays already fetched above, so it adds ZERO extra
  // Neon queries and shares the same 5-min memo.
  featuredGrid: CardTileData[];
  newSealed: SealedGroup[];
}

// How many cards the homepage featured grid shows. Kept small so mobile first
// paint stays fast (each tile fetches a card image).
const GRID_SIZE = 15;

async function computeHomeData(country: Country): Promise<HomeData> {
  const field = priceField(country);
  const [totalCards, pricedCards, inStockUnits, cheapestCards, valuableCards, storeGroups, popularCards, newSealed] =
    await Promise.all([
      prisma.card.count(),
      prisma.card.count({ where: { [field]: { not: null } } }),
      prisma.retailerPrice.count({ where: { country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } } }),
      getCheapestCards(12, country),
      getValuableCards(12, country),
      prisma.retailerPrice.groupBy({ by: ["retailer"], where: { country, NOT: { retailer: { startsWith: "ebay" } } } }),
      // Popular cards lead the homepage featured grid (valuable/cheapest backfill).
      getPopularCards(GRID_SIZE, country),
      getNewSealedArrivals(country, 12),
    ]);

  // Build the shoppable grid from the cards we already have (no extra query):
  // popular first (most shop-relevant), then chase grails, then bargains; dedup
  // by id so the same card never appears twice. Capped at GRID_SIZE so the
  // homepage stays light on mobile (fewer card images to fetch on first paint).
  const seen = new Set<string>();
  const featuredGrid: CardTileData[] = [];
  for (const c of [...popularCards, ...valuableCards, ...cheapestCards]) {
    if (featuredGrid.length >= GRID_SIZE) break;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    featuredGrid.push(c);
  }

  return {
    totalCards,
    pricedCards,
    inStockUnits,
    cheapestCards,
    valuableCards,
    storeCount: storeGroups.length,
    popularCards,
    featuredGrid,
    // The homepage tiles never render per-store listings, and Date fields
    // wouldn't survive the cache's JSON round-trip — strip them.
    newSealed: newSealed.map((g) => ({ ...g, listings: [] })),
  };
}

// In-process TTL memo keyed by market. unstable_cache silently no-ops above its
// 2 MB item limit — and this payload (4×12 card tiles + sealed) can exceed that —
// which would send EVERY homepage hit back to the DB (~10 queries each). The
// globalThis memo is the egress-safe pattern the codebase mandates (see db.ts):
// at most one homepage query burst per market per warm instance per TTL.
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
