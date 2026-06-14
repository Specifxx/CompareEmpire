import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { cardTileSelect } from "./cards";
import { priceField, type Country } from "./country";
import { POKEMON_SETS } from "./pokemon-sets";
import type { CardTileData } from "@/components/CardTile";
import type { PricePoint } from "@/components/PriceChart";

// The OPCompare Index — a stock-style view of how the One Piece singles market
// is moving, built from the daily per-market price snapshots.
//
// Methodology (shown on the page, because honesty sells): the index tracks a
// fixed BASKET — the highest-value cards in the chosen scope that have price
// history — and charts the basket's combined cheapest-store cost per day.
// Missing days are carried forward (a card that didn't re-snapshot keeps its
// last price), so the line moves only when prices actually move, not when the
// snapshot pool breathes.

export type IndexScope = { kind: "all" } | { kind: "recent" } | { kind: "set"; code: string };

export interface MoverRow {
  card: CardTileData;
  pct: number;
}

export interface SealedTightness {
  setCode: string;
  setName: string;
  inStock: number;
  total: number; // Box/ETB listings tracked
  cheapestBoxCents: number | null;
}

export interface MarketIndexData {
  points: PricePoint[]; // basket combined value per day, market currency
  basketSize: number;
  scopeLabel: string;
  risers: number;
  fallers: number;
  flat: number;
  gainers: MoverRow[];
  losers: MoverRow[];
  marketCapCents: number; // sum of TCGplayer guides (USD) across all tracked cards
  trackedCards: number;
  sealed: SealedTightness[];
}

const BASKET_SIZE = 250;
const WINDOW_DAYS = 60;

// Released sets newest-first (release dates are "YYYY/MM/DD" strings).
function releasedSetsNewestFirst(): { code: string; name: string }[] {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return POKEMON_SETS.filter((s) => s.releaseDate && s.releaseDate <= today)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .map((s) => ({ code: s.code, name: s.name }));
}

export function scopeFromParam(v: string | undefined): IndexScope {
  if (!v || v === "all") return { kind: "all" };
  if (v === "recent") return { kind: "recent" };
  return { kind: "set", code: v };
}

// Selector chips for the page: All · Recent · the 6 newest sets.
export function scopeChips(): { value: string; label: string }[] {
  return [
    { value: "all", label: "All cards" },
    { value: "recent", label: "Recent releases" },
    ...releasedSetsNewestFirst().slice(0, 6).map((s) => ({ value: s.code, label: s.name })),
  ];
}

async function computeIndex(country: Country, scope: IndexScope): Promise<MarketIndexData> {
  const field = priceField(country);

  // Scope → set filter + label.
  let setCodes: string[] | null = null;
  let scopeLabel = "All cards";
  if (scope.kind === "recent") {
    setCodes = releasedSetsNewestFirst().slice(0, 4).map((s) => s.code);
    scopeLabel = "Recent releases";
  } else if (scope.kind === "set") {
    setCodes = [scope.code];
    scopeLabel = POKEMON_SETS.find((s) => s.code === scope.code)?.name ?? scope.code.toUpperCase();
  }

  // The basket: most valuable priced cards in scope (tile data so the movers
  // rails can reuse CardTile directly).
  const basket = (await prisma.card.findMany({
    where: { [field]: { not: null }, ...(setCodes ? { setCode: { in: setCodes } } : {}) },
    orderBy: { [field]: { sort: "desc", nulls: "last" } } as never,
    take: BASKET_SIZE,
    select: cardTileSelect(country),
  })) as CardTileData[];
  const ids = basket.map((c) => c.id);

  // Snapshot history for the basket in this market.
  const since = new Date(Date.now() - WINDOW_DAYS * 86400e3);
  const history = ids.length
    ? await prisma.priceHistory.findMany({
        where: { cardId: { in: ids }, country, day: { gte: since } },
        select: { cardId: true, day: true, lowestPriceCents: true },
        orderBy: { day: "asc" },
      })
    : [];

  // Day grid + per-card forward fill → combined basket value per day.
  const dayKeys = [...new Set(history.map((h) => h.day.toISOString().slice(0, 10)))].sort();
  const byCard = new Map<string, Map<string, number>>();
  for (const h of history) {
    const m = byCard.get(h.cardId) ?? new Map<string, number>();
    m.set(h.day.toISOString().slice(0, 10), h.lowestPriceCents);
    byCard.set(h.cardId, m);
  }
  const points: PricePoint[] = [];
  const lastKnown = new Map<string, number>();
  // Back-fill: a card joins the index at its first snapshot — before that, use
  // its first value so the line doesn't jump when coverage grows.
  for (const [cardId, m] of byCard) {
    const firstDay = [...m.keys()].sort()[0];
    lastKnown.set(cardId, m.get(firstDay) as number);
  }
  for (const dk of dayKeys) {
    let sum = 0;
    for (const [cardId, m] of byCard) {
      const v = m.get(dk);
      if (v != null) lastKnown.set(cardId, v);
      sum += lastKnown.get(cardId) ?? 0;
    }
    points.push({ day: new Date(dk + "T00:00:00Z"), cents: sum });
  }

  // 7-day breadth + biggest movers within the basket.
  const movers: MoverRow[] = [];
  let risers = 0, fallers = 0, flat = 0;
  const cardById = new Map(basket.map((c) => [c.id, c]));
  for (const [cardId, m] of byCard) {
    const days = [...m.keys()].sort();
    if (days.length < 2) continue;
    const lastDay = days[days.length - 1];
    const lastT = new Date(lastDay).getTime();
    const target = lastT - 7 * 86400e3;
    let baseDay = days[0];
    for (const d of days) {
      if (new Date(d).getTime() <= lastT - 86400e3 / 2 &&
          Math.abs(new Date(d).getTime() - target) < Math.abs(new Date(baseDay).getTime() - target)) baseDay = d;
    }
    const base = m.get(baseDay) as number;
    const last = m.get(lastDay) as number;
    if (base <= 0 || baseDay === lastDay) continue;
    const pct = ((last - base) / base) * 100;
    if (pct > 1) risers++;
    else if (pct < -1) fallers++;
    else flat++;
    const card = cardById.get(cardId);
    if (card && Math.abs(pct) >= 2 && last >= 200) movers.push({ card, pct: Math.round(pct * 10) / 10 });
  }
  movers.sort((a, b) => b.pct - a.pct);
  const gainers = movers.filter((m) => m.pct > 0).slice(0, 8);
  const losers = movers.filter((m) => m.pct < 0).slice(-8).reverse();

  // Global stats (scope-independent): the "market cap" of the tracked database.
  const [cap, trackedCards] = await Promise.all([
    prisma.card.aggregate({ _sum: { marketPriceCents: true }, where: { marketPriceSource: "TCGplayer" } }),
    prisma.card.count({ where: { [field]: { not: null } } }),
  ]);

  // Sealed supply tightness for the newest sets: how camped are Boxes/ETBs?
  const sealedRows = await prisma.sealedListing.findMany({
    where: { country, productType: { in: ["Booster Box", "Elite Trainer Box"] }, setCode: { not: null } },
    select: { setCode: true, productType: true, inStock: true, priceCents: true },
  });
  const newest = releasedSetsNewestFirst().slice(0, 4);
  const sealed: SealedTightness[] = newest
    .map((s) => {
      const rows = sealedRows.filter((r) => r.setCode === s.code);
      const boxes = rows.filter((r) => r.productType === "Booster Box" && r.inStock);
      return {
        setCode: s.code,
        setName: s.name,
        inStock: rows.filter((r) => r.inStock).length,
        total: rows.length,
        cheapestBoxCents: boxes.length ? Math.min(...boxes.map((r) => r.priceCents)) : null,
      };
    })
    .filter((s) => s.total > 0);

  return {
    points,
    basketSize: byCard.size,
    scopeLabel,
    risers,
    fallers,
    flat,
    gainers,
    losers,
    marketCapCents: cap._sum.marketPriceCents ?? 0,
    trackedCards,
    sealed,
  };
}

export async function getMarketIndex(country: Country, scope: IndexScope): Promise<MarketIndexData> {
  const key = scope.kind === "set" ? `set:${scope.code}` : scope.kind;
  const data = await unstable_cache(
    () => computeIndex(country, scope),
    ["market-index", country, key],
    { revalidate: 1800 }
  )();
  // Dates don't survive the cache's JSON round-trip — revive them.
  return { ...data, points: data.points.map((p) => ({ day: new Date(p.day), cents: p.cents })) };
}
