import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { getCheapestCards, getValuableCards } from "./cheapest-cards";
import { getPopularCards } from "./trending";
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
  newSealed: SealedGroup[];
}

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
      getPopularCards(12, country),
      getNewSealedArrivals(country, 12),
    ]);
  return {
    totalCards,
    pricedCards,
    inStockUnits,
    cheapestCards,
    valuableCards,
    storeCount: storeGroups.length,
    popularCards,
    // The homepage tiles never render per-store listings, and Date fields
    // wouldn't survive the cache's JSON round-trip — strip them.
    newSealed: newSealed.map((g) => ({ ...g, listings: [] })),
  };
}

export async function getHomeData(country: Country): Promise<HomeData> {
  return unstable_cache(() => computeHomeData(country), ["home-data", country], { revalidate: 300 })();
}
