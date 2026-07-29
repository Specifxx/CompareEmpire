import { prisma } from "./db";
import { pickPrice, marketGuideCents, priceField, type Country } from "./country";

// Bounded per-retailer read (indexed on `retailer`) — never an unbounded scan.
// Even the busiest store has a few thousand listings, not 20k.
const MAX_ROWS = 4000;

export interface StoreListingRow {
  id: string;
  cardId: string;
  cardSlug: string | null;
  cardName: string;
  setName: string;
  collectorNumber: string;
  priceCents: number;
  isFoil: boolean;
  condition: string | null;
  isCheapestHere: boolean;
}

export interface StoreStats {
  totalInStock: number;
  cheapestCount: number; // cards where this store is the cheapest in-stock option
  biggestSaving: { cardName: string; cardSlug: string | null; savingCents: number; guideCents: number; priceCents: number } | null;
  rows: StoreListingRow[];
}

export async function storeStats(retailerKey: string, country: Country): Promise<StoreStats> {
  const field = priceField(country);
  const rows = await prisma.retailerPrice.findMany({
    where: { retailer: retailerKey, country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
    orderBy: { priceCents: "asc" },
    take: MAX_ROWS,
    select: {
      id: true,
      cardId: true,
      priceCents: true,
      isFoil: true,
      condition: true,
      card: {
        select: {
          slug: true, name: true, setName: true, collectorNumber: true,
          lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
          marketPriceCents: true, marketPriceSource: true,
        },
      },
    },
  });

  let cheapestCount = 0;
  let biggestSaving: StoreStats["biggestSaving"] = null;

  const out: StoreListingRow[] = rows.map((r) => {
    const cardLow = pickPrice(r.card, country);
    const isCheapestHere = cardLow != null && r.priceCents <= cardLow;
    if (isCheapestHere) {
      cheapestCount++;
      if (r.card.marketPriceSource === "TCGplayer") {
        const guide = marketGuideCents(r.card.marketPriceCents, country);
        if (guide != null) {
          const saving = guide - r.priceCents;
          if (saving > 0 && (biggestSaving == null || saving > biggestSaving.savingCents)) {
            biggestSaving = { cardName: r.card.name, cardSlug: r.card.slug, savingCents: saving, guideCents: guide, priceCents: r.priceCents };
          }
        }
      }
    }
    return {
      id: r.id,
      cardId: r.cardId,
      cardSlug: r.card.slug,
      cardName: r.card.name,
      setName: r.card.setName,
      collectorNumber: r.card.collectorNumber,
      priceCents: r.priceCents,
      isFoil: r.isFoil,
      condition: r.condition,
      isCheapestHere,
    };
  });

  return { totalInStock: out.length, cheapestCount, biggestSaving, rows: out };
}
