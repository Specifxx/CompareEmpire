import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { cardTileSelect, type CardTileData } from "./cards";

export interface MoverCard {
  card: CardTileData;
  // Percent change of the market price vs ~7 days ago.
  pct: number;
}

// Biggest 7-day market-price movers, from the daily PriceHistory snapshots
// (one global USD market — no per-country dimension here). Picks the latest
// snapshot day and the recorded day closest to 7 days before it, then ranks
// cards by % change. Returns [] until at least two days of history exist, so
// the homepage section simply doesn't render in a fresh database.
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

  // Floor cuts penny noise: a 50¢ bulk common doubling isn't a story. The join
  // also enforces "at least two distinct days" per card — a card snapshotted
  // only on the latest day simply has no baseline row to join against.
  const rows = await prisma.$queryRaw<{ cardId: string; now: number; before: number }[]>(Prisma.sql`
    SELECT a."cardId", a."marketPriceCents" AS now, b."marketPriceCents" AS before
    FROM "PriceHistory" a
    JOIN "PriceHistory" b
      ON b."cardId" = a."cardId" AND b."day" = ${baseline}::date
    WHERE a."day" = ${d0}::date
      AND a."marketPriceCents" >= 200
      AND b."marketPriceCents" > 0
      AND a."marketPriceCents" <> b."marketPriceCents"
  `);
  if (!rows.length) return [];

  const withPct = rows
    .map((r) => ({
      cardId: r.cardId,
      pct: ((Number(r.now) - Number(r.before)) / Number(r.before)) * 100,
    }))
    // Ignore sub-2% wiggle so the section is real movement, not feed jitter.
    .filter((r) => Math.abs(r.pct) >= 2);

  // Balance risers and fallers so the section isn't all one direction, then
  // rank the final pick by magnitude.
  const risers = withPct.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, Math.ceil(limit / 2));
  const fallers = withPct.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, Math.floor(limit / 2));
  const picked = [...risers, ...fallers].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, limit);
  if (!picked.length) return [];

  const cards = await prisma.card.findMany({
    where: { id: { in: picked.map((p) => p.cardId) } },
    select: cardTileSelect,
  });
  const byId = new Map(cards.map((c) => [c.id, c]));

  return picked
    .filter((p) => byId.has(p.cardId))
    .map((p) => ({ card: byId.get(p.cardId)!, pct: p.pct }));
}

// The movers scan joins two full snapshot days — cache it for an hour; the
// snapshots only change once a day anyway.
const cachedTopMovers = unstable_cache((limit: number) => computeTopMovers(limit), ["tpe-top-movers-v1"], {
  revalidate: 3600,
});

export function getTopMovers(limit = 12): Promise<MoverCard[]> {
  return cachedTopMovers(limit);
}
