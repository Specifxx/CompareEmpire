import { prisma } from "./db";
import type { Country } from "./country";

// Portfolio value-over-time, built from the same daily per-card price snapshots
// that power the OPCompare Index (see lib/market-index.ts) — but weighted by how
// many copies the visitor owns instead of a fixed basket. Each card is
// forward-filled (a day with no fresh snapshot keeps its last price) so the line
// moves only when prices actually move, and a card joins the series at its first
// snapshot back-filled with that first value, so the total doesn't jump as
// snapshot coverage grows.

export interface PortfolioHolding {
  cardId: string;
  qty: number;
}

export interface PortfolioPoint {
  day: string; // calendar day, "YYYY-MM-DD" (the chart's x-axis)
  cents: number; // combined value of the holdings on that day, market currency
}

// Bound the per-request history read. Per the egress rules in lib/db.ts, request
// handlers must stay per-entity scoped; a portfolio is the visitor's own bounded
// set, and we cap it so one chart request can never pull an unbounded dataset.
const MAX_HOLDINGS = 300;

export async function computePortfolioSeries(
  holdings: PortfolioHolding[],
  market: Country,
  windowDays: number
): Promise<PortfolioPoint[]> {
  // De-dupe + sanitise quantities; keep only real, positive holdings.
  const qtyById = new Map<string, number>();
  for (const h of holdings) {
    const q = Math.floor(h.qty);
    if (h.cardId && Number.isFinite(q) && q > 0) {
      qtyById.set(h.cardId, Math.min(q, 9999));
    }
  }
  const ids = [...qtyById.keys()].slice(0, MAX_HOLDINGS);
  if (!ids.length) return [];

  const since = new Date(Date.now() - windowDays * 86400e3);
  const history = await prisma.priceHistory.findMany({
    where: { cardId: { in: ids }, country: market, day: { gte: since } },
    select: { cardId: true, day: true, lowestPriceCents: true },
    orderBy: { day: "asc" },
  });
  if (!history.length) return [];

  const dayKeys = [...new Set(history.map((h) => h.day.toISOString().slice(0, 10)))].sort();
  const byCard = new Map<string, Map<string, number>>();
  for (const h of history) {
    const m = byCard.get(h.cardId) ?? new Map<string, number>();
    m.set(h.day.toISOString().slice(0, 10), h.lowestPriceCents);
    byCard.set(h.cardId, m);
  }

  // Back-fill each card with its first known price so the line starts smooth.
  const lastKnown = new Map<string, number>();
  for (const [cardId, m] of byCard) {
    const firstDay = [...m.keys()].sort()[0];
    lastKnown.set(cardId, m.get(firstDay) as number);
  }

  const points: PortfolioPoint[] = [];
  for (const dk of dayKeys) {
    let sum = 0;
    for (const [cardId, m] of byCard) {
      const v = m.get(dk);
      if (v != null) lastKnown.set(cardId, v);
      sum += (lastKnown.get(cardId) ?? 0) * (qtyById.get(cardId) ?? 0);
    }
    points.push({ day: dk, cents: sum });
  }
  return points;
}
