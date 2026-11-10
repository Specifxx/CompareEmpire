// The weekly price chart (X3, 2026-11-10; modelled on RiftCompare's Hot 40): one dated page per week and region, with a permanent
// URL (/<region>/charts/<YYYY-MM-DD>, the week's last day, a Sunday), the products whose cheapest in-stock price rose most that week,
// ranked, each with last week's rank, and the biggest falls. Pure, from data/public/price-history.json (lib/price-history.ts) alone,
// so any past week can be drawn again exactly as it was and a page never changes after its week ends.
//
// REAL MOVES ONLY. A product counts when it was in stock at two or more stores on both the week's last day and seven days before, and
// its cheapest price moved by CHART_MIN_PCT or more but under CHART_MAX_PCT (a bigger jump is a misfiled listing, not a price). A week
// with fewer than CHART_MIN_MOVES such products publishes nothing: no page, no sitemap entry, no link.
import type { PriceHistory } from "./price-history";

export const CHART_MIN_PCT = 5;
export const CHART_MAX_PCT = 50;
export const CHART_RISERS = 20;
export const CHART_FALLERS = 10;
export const CHART_MIN_MOVES = 5;

export interface ChartRow {
  slug: string;
  rank: number;
  /** This product's rank in the previous week's risers, or null when it was not on that list (or there is no previous chart). */
  lastRank: number | null;
  before: number;
  after: number;
  pct: number;
  stores: number;
}

export interface WeeklyChart {
  /** The week's last day (YYYY-MM-DD, a Sunday) and its first comparison day, seven days before. */
  week: string;
  from: string;
  risers: ChartRow[];
  fallers: ChartRow[];
  /** Products compared (in stock at 2+ stores on both days). */
  compared: number;
  published: boolean;
}

const iso = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);
const dayOf = (s: string) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
/** Day 3 is a Sunday (1970-01-01 was a Thursday). */
const isSunday = (day: number) => ((day % 7) + 7) % 7 === 3;

/** The value of a change-point series on a day: the last point on or before it. */
function valueOn(h: PriceHistory, market: string, slug: string, day: number): { cents: number | null; stores: number } | null {
  const pts = h.series[market]?.[slug];
  if (!pts?.length || pts[0][0] > day || day > h.through) return null;
  let v = pts[0];
  for (const p of pts) {
    if (p[0] > day) break;
    v = p;
  }
  return { cents: v[1], stores: v[2] };
}

/** Every week the history can chart (its last day a Sunday, seven days of history before it), newest first. */
export function chartWeeks(h: PriceHistory | null): string[] {
  if (!h) return [];
  const out: string[] = [];
  for (let d = h.through; d - 7 >= h.since; d--) if (isSunday(d)) out.push(iso(d));
  return out;
}

function moves(h: PriceHistory, market: string, end: number): { rows: Omit<ChartRow, "rank" | "lastRank">[]; compared: number } {
  const rows: Omit<ChartRow, "rank" | "lastRank">[] = [];
  let compared = 0;
  for (const slug of Object.keys(h.series[market] ?? {})) {
    const a = valueOn(h, market, slug, end - 7);
    const b = valueOn(h, market, slug, end);
    if (!a || !b || a.cents == null || b.cents == null || a.stores < 2 || b.stores < 2) continue;
    compared++;
    const pct = Math.round(((b.cents - a.cents) / a.cents) * 100);
    if (Math.abs(pct) < CHART_MIN_PCT || Math.abs(pct) >= CHART_MAX_PCT) continue;
    rows.push({ slug, before: a.cents, after: b.cents, pct, stores: b.stores });
  }
  return { rows, compared };
}

function rankRisers(h: PriceHistory, market: string, end: number) {
  const { rows, compared } = moves(h, market, end);
  const up = rows.filter((r) => r.pct > 0).sort((x, y) => y.pct - x.pct || y.after - x.after || x.slug.localeCompare(y.slug)).slice(0, CHART_RISERS);
  const down = rows.filter((r) => r.pct < 0).sort((x, y) => x.pct - y.pct || y.after - x.after || x.slug.localeCompare(y.slug)).slice(0, CHART_FALLERS);
  return { up, down, compared };
}

/** One week's chart in one market, or null when the history cannot chart that week. */
export function weeklyChart(h: PriceHistory | null, market: string, week: string): WeeklyChart | null {
  if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const end = dayOf(week);
  if (!isSunday(end) || end > h.through || end - 7 < h.since) return null;
  const cur = rankRisers(h, market, end);
  const prev = end - 14 >= h.since ? rankRisers(h, market, end - 7).up : [];
  const prevRank = new Map(prev.map((r, i) => [r.slug, i + 1]));
  const risers = cur.up.map((r, i) => ({ ...r, rank: i + 1, lastRank: prevRank.get(r.slug) ?? null }));
  const fallers = cur.down.map((r, i) => ({ ...r, rank: i + 1, lastRank: null }));
  return { week, from: iso(end - 7), risers, fallers, compared: cur.compared, published: risers.length + fallers.length >= CHART_MIN_MOVES };
}

/** The weeks with a published chart in a market, newest first. */
export function publishedWeeks(h: PriceHistory | null, market: string): string[] {
  return chartWeeks(h).filter((w) => weeklyChart(h, market, w)?.published);
}

/** "▲3" (up three places), "▼2", "=" or "New". */
export function rankMove(row: Pick<ChartRow, "rank" | "lastRank">): string {
  if (row.lastRank == null) return "New";
  if (row.lastRank === row.rank) return "=";
  return row.lastRank > row.rank ? `▲${row.lastRank - row.rank}` : `▼${row.rank - row.lastRank}`;
}
