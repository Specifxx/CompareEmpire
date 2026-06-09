import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { cardTileSelect } from "./cards";
import { priceField, type Country } from "./country";
import type { CardTileData } from "@/components/CardTile";

export interface MoverCard {
  card: CardTileData;
  // Percent change of the cheapest AU price vs ~7 days ago (e.g. 12.4 or -8.1).
  pct: number;
  nowCents: number;
  beforeCents: number;
}

// Biggest 7-day price movers, from the daily PriceHistory snapshots (AU market —
// the snapshots store the cheapest AU price). Picks the latest snapshot day and
// the recorded day closest to 7 days before it, then ranks cards by % change.
// Returns [] until at least two days of history exist, so the homepage section
// simply doesn't render in a fresh database.
async function computeTopMovers(limit: number): Promise<MoverCard[]> {
  const days = await prisma.priceHistory.findMany({
    distinct: ["day"],
    orderBy: { day: "desc" },
    select: { day: true },
    take: 30,
  });
  if (days.length < 2) return [];

  const d0 = days[0].day;
  const target = d0.getTime() - 7 * 86400_000;
  // Closest earlier day to one week back (history may have gaps).
  const baseline = days
    .slice(1)
    .reduce((best, d) => (Math.abs(d.day.getTime() - target) < Math.abs(best.day.getTime() - target) ? d : best)).day;

  // Floors cut noise: a 50¢ bulk common doubling isn't a story. Baseline ≥ $3.
  const rows = await prisma.$queryRaw<{ cardId: string; now: number; before: number }[]>(Prisma.sql`
    SELECT a."cardId", a."lowestPriceCents" AS now, b."lowestPriceCents" AS before
    FROM "PriceHistory" a
    JOIN "PriceHistory" b ON b."cardId" = a."cardId" AND b."day" = ${baseline}::date
    WHERE a."day" = ${d0}::date
      AND b."lowestPriceCents" >= 300
      AND a."lowestPriceCents" >= 100
      AND a."lowestPriceCents" <> b."lowestPriceCents"
  `);
  if (!rows.length) return [];

  const withPct = rows
    .map((r) => ({ cardId: r.cardId, now: Number(r.now), before: Number(r.before), pct: ((Number(r.now) - Number(r.before)) / Number(r.before)) * 100 }))
    // Ignore sub-2% wiggle so the section is real movement, not feed jitter.
    .filter((r) => Math.abs(r.pct) >= 2);

  const risers = withPct.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, Math.ceil(limit / 2));
  const fallers = withPct.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, Math.floor(limit / 2));
  const picked = [...risers, ...fallers].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, limit);
  if (!picked.length) return [];

  const cards = (await prisma.card.findMany({
    where: { id: { in: picked.map((p) => p.cardId) } },
    select: cardTileSelect("AU"),
  })) as CardTileData[];
  const byId = new Map(cards.map((c) => [c.id, c]));

  return picked
    .filter((p) => byId.has(p.cardId))
    .map((p) => ({ card: byId.get(p.cardId)!, pct: p.pct, nowCents: p.now, beforeCents: p.before }));
}

// The movers scan joins two full snapshot days (~20k rows each) — cache it for an
// hour; snapshots only change once a day anyway.
export const getTopMovers = unstable_cache((limit: number = 12) => computeTopMovers(limit), ["top-movers-v1"], {
  revalidate: 3600,
});

// Most-viewed priced cards in the visitor's market — "what everyone's looking at".
export async function getPopularCards(limit: number, country: Country): Promise<CardTileData[]> {
  return (await prisma.card.findMany({
    where: { viewCount: { gt: 0 }, [priceField(country)]: { not: null } },
    orderBy: [{ viewCount: "desc" }],
    take: limit,
    select: cardTileSelect(country),
  })) as CardTileData[];
}
