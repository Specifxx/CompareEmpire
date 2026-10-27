import { prisma } from "./db";
import { priceField, type Country } from "./country";
import { cardTileSelect } from "./cards";
import type { CardTileData } from "@/components/CardTile";

// Movers ("biggest % change") used to live here, backed by a per-card, per-day
// PriceHistory table. That table is gone: at catalogue x market x day it grew
// without bound for a feature that only ever read the last two days. Recomputing
// it is not possible without reintroducing that growth, so movers is not offered.
// What remains is the demand signal we DO store for free on the card row.

// Most-viewed priced cards in the visitor's market — "what everyone's looking at".
export async function getPopularCards(limit: number, country: Country): Promise<CardTileData[]> {
  return (await prisma.card.findMany({
    where: { viewCount: { gt: 0 }, [priceField(country)]: { not: null } },
    orderBy: [{ viewCount: "desc" }],
    take: limit,
    select: cardTileSelect(country),
  })) as CardTileData[];
}
