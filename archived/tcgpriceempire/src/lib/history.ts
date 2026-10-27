import { prisma } from "./db";

// One day of a card's market-price history, ready for the chart. `day` is a
// plain YYYY-MM-DD string so the series can cross the server→client boundary
// (and be cached) without Date serialization surprises.
export interface PricePoint {
  day: string;
  priceCents: number;
}

// The card's daily market-price snapshots for the last `days` days, oldest
// first (the order the chart draws in). A windowed `gte` filter — not a row
// count — so gaps in the snapshots can't drag in ancient history.
export async function getPriceHistory(cardId: string, days = 90): Promise<PricePoint[]> {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await prisma.priceHistory.findMany({
    where: { cardId, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { day: true, marketPriceCents: true },
  });
  // `day` is @db.Date, so toISOString() is always UTC midnight — slicing the
  // date part can't shift across a day boundary.
  return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), priceCents: r.marketPriceCents }));
}
