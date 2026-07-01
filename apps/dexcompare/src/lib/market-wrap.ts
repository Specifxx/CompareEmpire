import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { dbHistory } from "./db-history";
import { COUNTRIES, type Country } from "./country";

// The Daily Market Wrap — an automated, AFR-style report on how the Pokémon
// singles market moved, generated entirely from our own per-market price
// snapshots (PriceHistory). Nothing is editorialised beyond deterministic
// templates over real numbers: the global index is the equal-weighted average
// of each market's day-over-day basket move, and every figure shown can be
// traced back to a snapshot row.
//
// "Global index" methodology: for each market (AU/NZ/US/GB) we take the cards
// snapshotted on BOTH the wrap day and the previous snapshot day, sum the
// cheapest live prices on each day (matched pairs only, so pool changes can't
// fake a move), and take the % change. The global number is the equal-weighted
// average of the four market moves — currency-neutral by construction, since
// each market's % is computed in its own currency.

const MARKETS: Country[] = ["AU", "NZ", "US", "GB"];
// Ignore sub-$4-ish bulk in mover lists — a 2c move on a 20c common is noise.
const MOVER_FLOOR_CENTS = 400;

export interface WrapMover {
  id: string;
  name: string;
  slug: string | null;
  setCode: string;
  pct: number;
  fromCents: number;
  toCents: number;
}

export interface WrapMarketLine {
  country: Country;
  d1: number | null; // day-over-day %, matched-pairs basket
  paired: number; // cards snapshotted on both days
  risers: number;
  fallers: number;
  flat: number;
  basketCents: number | null; // matched basket cost on wrap day (market currency)
}

export interface MarketWrapData {
  day: string; // YYYY-MM-DD (Sydney snapshot day)
  prevDay: string;
  globalD1: number | null;
  marketsWithData: number;
  marketsUp: number;
  marketsDown: number;
  markets: WrapMarketLine[];
  insight: { country: Country; d1: number; gainers: WrapMover[]; losers: WrapMover[] } | null;
  headline: string;
  lede: string;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Distinct snapshot days (any market), oldest → newest.
export async function wrapDays(limit = 40): Promise<string[]> {
  const rows = await dbHistory.priceHistory.findMany({
    distinct: ["day"],
    select: { day: true },
    orderBy: { day: "desc" },
    take: limit,
  });
  return rows.map((r) => ymd(r.day)).reverse();
}

// The most recent day that HAS a predecessor (i.e. a computable wrap), or null.
export async function latestWrapDay(): Promise<string | null> {
  const days = await wrapDays(5);
  return days.length >= 2 ? days[days.length - 1] : null;
}

function verbFor(pct: number): string {
  const a = Math.abs(pct);
  if (a < 0.05) return "is flat";
  if (pct > 0) return a >= 1.5 ? "jumps" : a >= 0.5 ? "rises" : "edges up";
  return a >= 1.5 ? "slides" : a >= 0.5 ? "falls" : "slips";
}

function fmtPct(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

async function computeWrap(day: string): Promise<MarketWrapData | null> {
  const days = await wrapDays();
  const i = days.indexOf(day);
  if (i <= 0) return null; // unknown day, or the very first day (no predecessor)
  const prevDay = days[i - 1];

  const markets: WrapMarketLine[] = [];
  const perMarketPairs = new Map<Country, Map<string, { from: number; to: number }>>();

  for (const country of MARKETS) {
    const [prevRows, dayRows] = await Promise.all([
      dbHistory.priceHistory.findMany({
        where: { country, day: new Date(`${prevDay}T00:00:00.000Z`) },
        select: { cardId: true, lowestPriceCents: true },
      }),
      dbHistory.priceHistory.findMany({
        where: { country, day: new Date(`${day}T00:00:00.000Z`) },
        select: { cardId: true, lowestPriceCents: true },
      }),
    ]);
    const prev = new Map(prevRows.map((r) => [r.cardId, r.lowestPriceCents]));
    const pairs = new Map<string, { from: number; to: number }>();
    let fromSum = 0;
    let toSum = 0;
    let risers = 0;
    let fallers = 0;
    let flat = 0;
    for (const r of dayRows) {
      const p = prev.get(r.cardId);
      if (p == null) continue;
      pairs.set(r.cardId, { from: p, to: r.lowestPriceCents });
      fromSum += p;
      toSum += r.lowestPriceCents;
      if (r.lowestPriceCents > p) risers++;
      else if (r.lowestPriceCents < p) fallers++;
      else flat++;
    }
    perMarketPairs.set(country, pairs);
    markets.push({
      country,
      d1: fromSum > 0 ? ((toSum - fromSum) / fromSum) * 100 : null,
      paired: pairs.size,
      risers,
      fallers,
      flat,
      basketCents: pairs.size > 0 ? toSum : null,
    });
  }

  const withData = markets.filter((m) => m.d1 != null) as (WrapMarketLine & { d1: number })[];
  if (withData.length === 0) return null;
  const globalD1 = withData.reduce((s, m) => s + m.d1, 0) / withData.length;

  // Regional insight: the market that moved hardest today.
  const insightMarket = [...withData].sort((a, b) => Math.abs(b.d1) - Math.abs(a.d1))[0];
  let insight: MarketWrapData["insight"] = null;
  if (insightMarket) {
    const pairs = perMarketPairs.get(insightMarket.country)!;
    const moves = [...pairs.entries()]
      .filter(([, v]) => v.from >= MOVER_FLOOR_CENTS && v.to !== v.from)
      .map(([cardId, v]) => ({ cardId, pct: ((v.to - v.from) / v.from) * 100, from: v.from, to: v.to }))
      // Outlier guard: a ≥80% drop (or ≥300% spike) is bad data, not a real move —
      // keep it out of the published Market Wrap.
      .filter((m) => m.pct > -80 && m.pct < 300);
    const gainers = [...moves].sort((a, b) => b.pct - a.pct).slice(0, 3);
    const losers = [...moves].sort((a, b) => a.pct - b.pct).slice(0, 3);
    const ids = [...new Set([...gainers, ...losers].map((m) => m.cardId))];
    const cards = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, setCode: true },
    });
    const byId = new Map(cards.map((c) => [c.id, c]));
    const toMover = (m: { cardId: string; pct: number; from: number; to: number }): WrapMover | null => {
      const c = byId.get(m.cardId);
      if (!c) return null;
      return { id: c.id, name: c.name, slug: c.slug, setCode: c.setCode, pct: m.pct, fromCents: m.from, toCents: m.to };
    };
    insight = {
      country: insightMarket.country,
      d1: insightMarket.d1,
      gainers: gainers.map(toMover).filter(Boolean) as WrapMover[],
      losers: losers.map(toMover).filter(Boolean) as WrapMover[],
    };
  }

  const marketsUp = withData.filter((m) => m.d1 > 0.05).length;
  const marketsDown = withData.filter((m) => m.d1 < -0.05).length;

  const headline = `DexCompare Global Index ${verbFor(globalD1)}${Math.abs(globalD1) < 0.05 ? "" : ` ${Math.abs(globalD1).toFixed(2)}%`}`;
  const insightBit = insight
    ? ` ${COUNTRIES[insight.country].place} moved hardest at ${fmtPct(insight.d1)}.`
    : "";
  const lede =
    `Pokémon singles ${globalD1 >= 0.05 ? "rose" : globalD1 <= -0.05 ? "fell" : "held steady"} ${
      Math.abs(globalD1) < 0.05 ? "" : `${Math.abs(globalD1).toFixed(2)}% `
    }across the ${withData.length} markets DexCompare tracks, with ${marketsUp} market${marketsUp === 1 ? "" : "s"} up and ${marketsDown} down on the day.` +
    insightBit;

  return {
    day,
    prevDay,
    globalD1,
    marketsWithData: withData.length,
    marketsUp,
    marketsDown,
    markets,
    insight,
    headline,
    lede,
  };
}

// Cached per day; the underlying snapshots only change once a day (or when the
// manual snapshot workflow replaces today's rows — 30 min staleness is fine).
export async function getMarketWrap(day: string): Promise<MarketWrapData | null> {
  const cached = unstable_cache(() => computeWrap(day), ["market-wrap", day], { revalidate: 1800 })();
  const data = await cached;
  return data ?? null;
}
