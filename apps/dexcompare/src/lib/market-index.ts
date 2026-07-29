// The DexCompare Index (P3): a search-weighted basket of up to 500 cards.
// History-free by design (see the IndexSnapshot model comment) — only the
// daily aggregate basket value is persisted, one row per (key, day). The
// constituent table is always computed LIVE from current Card prices; there
// is no per-card time series anywhere, so no 1d/7d change column is possible
// yet (see MoversNotice in the /market page — the optional module described
// in the sprint brief would add exactly the bounded snapshot table needed
// for that, but only on explicit approval).
import { prisma } from "./db";
import { POKEMON_SETS } from "./pokemon-sets";
import { pickPrice, priceField, type Country } from "./country";

export type IndexKey = "GLOBAL" | "AU" | "US" | "GB" | "ERA_VINTAGE" | "ERA_MODERN" | "ERA_CURRENT";

export const MARKET_INDEX_KEYS: IndexKey[] = ["GLOBAL", "AU", "US", "GB"];
export const ERA_INDEX_KEYS: IndexKey[] = ["ERA_VINTAGE", "ERA_MODERN", "ERA_CURRENT"];
export const ALL_INDEX_KEYS: IndexKey[] = [...MARKET_INDEX_KEYS, ...ERA_INDEX_KEYS];

export const INDEX_LABELS: Record<IndexKey, string> = {
  GLOBAL: "DexCompare Index (Global)",
  AU: "DexCompare Index — AU",
  US: "DexCompare Index — US",
  GB: "DexCompare Index — UK",
  ERA_VINTAGE: "Vintage / WOTC Index",
  ERA_MODERN: "Modern Era Index",
  ERA_CURRENT: "Current Era Index",
};

const MAX_CONSTITUENTS = 500;
// No single card can dominate the basket — cap its share of total weight.
const MAX_WEIGHT_SHARE = 0.02;

// Era bucketing by set release year — simpler and more robust than trying to
// enumerate exact `series` string values (which change as new sets ship).
// WOTC era ended in 2003; "current" is the newest 2 series shipping today.
function eraOfSetCode(setCode: string): "ERA_VINTAGE" | "ERA_MODERN" | "ERA_CURRENT" | null {
  const set = POKEMON_SETS.find((s) => s.code === setCode);
  if (!set?.releaseDate) return null;
  const year = parseInt(set.releaseDate.slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;
  if (year <= 2003) return "ERA_VINTAGE";
  const currentSeries = new Set(POKEMON_SETS.slice(0, 20).map((s) => s.series)); // newest sets, most recent series
  const newestSeries = [...currentSeries][0];
  return set.series === newestSeries ? "ERA_CURRENT" : "ERA_MODERN";
}

export interface Constituent {
  cardId: string;
  slug: string | null;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  imageThumbUrl: string | null;
  priceCents: number;
  weight: number; // 0..1 share of the basket
}

// Selects up to MAX_CONSTITUENTS cards for a given index key, weighted by
// search demand (searchCount — the purer demand signal per cards.ts), capped
// per-card. Bounded, indexed query — never an unbounded scan.
export async function selectConstituents(key: IndexKey): Promise<Constituent[]> {
  const market: Country = key === "US" ? "US" : key === "GB" ? "GB" : "AU"; // era/global indices price in AU baseline
  const field = priceField(market);

  const isEra = key.startsWith("ERA_");
  const candidates = await prisma.card.findMany({
    where: { hasLivePrice: true, [field]: { not: null } },
    orderBy: [{ searchCount: "desc" }, { viewCount: "desc" }],
    take: 4000, // demand-ranked pool to filter/era-bucket from, well short of the full catalogue
    select: {
      id: true, slug: true, name: true, setName: true, setCode: true, collectorNumber: true,
      imageThumbUrl: true, searchCount: true, viewCount: true,
      lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
    },
  });

  const filtered = isEra
    ? candidates.filter((c) => eraOfSetCode(c.setCode) === key)
    : candidates;

  const picked = filtered.slice(0, MAX_CONSTITUENTS);
  if (picked.length === 0) return [];

  const rawWeights = picked.map((c) => Math.max(1, c.searchCount) + Math.max(1, c.viewCount) * 0.1);
  const total = rawWeights.reduce((s, w) => s + w, 0);
  const capped = rawWeights.map((w) => Math.min(w / total, MAX_WEIGHT_SHARE));
  const cappedTotal = capped.reduce((s, w) => s + w, 0);

  return picked.map((c, i) => ({
    cardId: c.id,
    slug: c.slug,
    name: c.name,
    setName: c.setName,
    setCode: c.setCode,
    collectorNumber: c.collectorNumber,
    imageThumbUrl: c.imageThumbUrl,
    priceCents: pickPrice(c, market) ?? 0,
    weight: capped[i] / cappedTotal, // renormalise to sum to 1 after capping
  }));
}

export function basketValueCents(constituents: Constituent[]): number {
  // Basket value = weighted-average price, expressed as if buying the whole
  // basket at its weights (i.e. sum(price * weight)), scaled to a round
  // "buy one share" figure. This is the raw number persisted in IndexSnapshot.
  return Math.round(constituents.reduce((s, c) => s + c.priceCents * c.weight, 0));
}

// Idempotent — safe to re-run same-day (upserts today's row).
export async function snapshotIndex(key: IndexKey): Promise<{ key: IndexKey; basketCents: number; count: number } | null> {
  const constituents = await selectConstituents(key);
  if (constituents.length === 0) return null;
  const basketCents = basketValueCents(constituents);
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  await prisma.indexSnapshot.upsert({
    where: { key_day: { key, day } },
    create: { key, day, basketCents, constituentCount: constituents.length },
    update: { basketCents, constituentCount: constituents.length },
  });
  return { key, basketCents, count: constituents.length };
}

export interface IndexPoint {
  day: string; // ISO date
  value: number; // index points, 1000 = the earliest stored snapshot
  basketCents: number;
}

// Reads the stored series and converts raw basket cents into index points
// (base 1000 at the OLDEST snapshot on file) — the only place a "value" is
// computed as a ratio; nothing per-card is ever read for this.
export async function readIndexSeries(key: IndexKey, days: number): Promise<IndexPoint[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await prisma.indexSnapshot.findMany({
    where: { key, day: { gte: since } },
    orderBy: { day: "asc" },
    select: { day: true, basketCents: true },
  });
  if (rows.length === 0) return [];
  const base = rows[0].basketCents || 1;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    value: (r.basketCents / base) * 1000,
    basketCents: r.basketCents,
  }));
}

export interface IndexStats {
  latest: IndexPoint | null;
  changePct: number | null; // vs the oldest point in the requested range
  rangeLow: number | null;
  rangeHigh: number | null;
  volatility30d: number | null; // stddev of daily % changes over the last 30 stored points
  // % of day-over-day transitions where the INDEX itself rose — an
  // advance/decline-style breadth measure computed entirely from the stored
  // index series, not from any per-constituent history (which doesn't exist).
  breadthPct: number | null;
}

export function computeIndexStats(series: IndexPoint[]): IndexStats {
  if (series.length === 0) return { latest: null, changePct: null, rangeLow: null, rangeHigh: null, volatility30d: null, breadthPct: null };
  const latest = series[series.length - 1];
  const first = series[0];
  const changePct = first.value > 0 ? ((latest.value - first.value) / first.value) * 100 : null;
  const values = series.map((p) => p.value);
  const rangeLow = Math.min(...values);
  const rangeHigh = Math.max(...values);

  const last30 = series.slice(-30);
  let volatility30d: number | null = null;
  let breadthPct: number | null = null;
  if (last30.length >= 3) {
    const rets: number[] = [];
    for (let i = 1; i < last30.length; i++) {
      if (last30[i - 1].value > 0) rets.push((last30[i].value - last30[i - 1].value) / last30[i - 1].value);
    }
    if (rets.length >= 2) {
      const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
      const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
      volatility30d = Math.sqrt(variance) * 100;
      breadthPct = (rets.filter((r) => r > 0).length / rets.length) * 100;
    }
  }
  return { latest, changePct, rangeLow, rangeHigh, volatility30d, breadthPct };
}
