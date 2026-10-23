// The homepages' market report (SEO sprint, 2026-10-23): what the landing page and each region home say about TODAY's market, in
// sentences built from the live data at render, never templated filler. Per region: the price range of the three headline types
// (cheapest, median and dearest in-stock price, with the products named and linked), the cheapest per pack, the newest released
// set's booster box, the open pre-orders of the soonest upcoming set, and what the daily snapshots (lib/price-history.ts) show about
// stock over the days they cover. The landing page sets the seven regions side by side.
//
// THE READS (loadMarketReport): per market, one capped read of the open headline products of released sets (≤ 400 small rows), one of
// the soonest upcoming set's open products (≤ 60 rows), regionOverview, and the price-history file already bundled with the function.
// Pages that call it are force-dynamic and kept a day by Vercel's CDN (next.config.js CDN_PAGES), so it runs about once a day per page.
//
// THE COPY RULES (lib/copy-rules.ts) hold: the history says what changed between two snapshot days, never "restocked", "back in
// stock", "dropped" or a former price; no investment, trend or "best time to buy" claims. Everything here but the loader is pure.
import { cardSelect, OPEN, regionOverview, toCard, type ProductCardData } from "./data";
import { prisma } from "./db";
import { money, plural } from "./format";
import { packsForLabel, perPackCents } from "./packs";
import { dailySeries, isoOfDay, readPriceHistory, type PriceHistory } from "./price-history";
import { formatRelease } from "./release";
import { REGIONS, type Market, type RegionInfo } from "./regions";
import { SET_BY_CODE, SETS, type PokemonSet } from "./sets";

/** The types the report prices, in the order it shows them. */
export const REPORT_TYPES = ["Booster Box", "Elite Trainer Box", "Booster Bundle"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** How many snapshot days the stock paragraph looks back over (at most). */
export const STOCK_WINDOW_DAYS = 7;

export interface TypeRange {
  label: ReportType;
  /** Open products of released sets of this type with a price. */
  count: number;
  cheapest: ProductCardData;
  dearest: ProductCardData;
  medianCents: number;
  /** The open product of this type with the lowest price per pack, and that price. */
  perPack: { p: ProductCardData; cents: number; packs: number } | null;
}

export interface StockMoves {
  /** First and last snapshot day compared (YYYY-MM-DD). */
  from: string;
  to: string;
  /** Sealed products (any type) no store had in stock on `from` and at least one store has on `to`. */
  cameInCount: number;
  /** Of those, the headline products (box, ETB, bundle) open today, most stores first. */
  cameIn: ProductCardData[];
  /** Sealed products in stock somewhere on `from` and nowhere on `to`. */
  wentOut: number;
  /** Sealed products in stock on both days at more stores / fewer stores. */
  wider: number;
  narrower: number;
}

export interface MarketReport {
  r: RegionInfo;
  today: string;
  overview: { products: number; inStock: number; stores: number };
  types: TypeRange[];
  /** The newest released set with a booster box in stock here, and its cheapest one. */
  newestBox: { set: PokemonSet; p: ProductCardData } | null;
  /** The soonest upcoming set with something open for pre-order here: its cheapest product of each report type, and its open count. */
  preorder: { set: PokemonSet; lines: ProductCardData[]; open: number } | null;
  stock: StockMoves | null;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const byPrice = (a: ProductCardData, b: ProductCardData) => (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0) || a.slug.localeCompare(b.slug);

/** Pure: the price range of each report type among open, priced products of released sets. */
export function typeRanges(products: readonly ProductCardData[]): TypeRange[] {
  const out: TypeRange[] = [];
  for (const label of REPORT_TYPES) {
    const rows = products.filter((p) => p.productType === label && (p.lowestPriceCents ?? 0) > 0 && (p.inStockStores > 0 || p.marketplaceOpen)).sort(byPrice);
    if (!rows.length) continue;
    let perPack: TypeRange["perPack"] = null;
    for (const p of rows) {
      const packs = packsForLabel(p.productType, p.setCode, p.name);
      const cents = perPackCents(p.lowestPriceCents, packs);
      if (packs && cents != null && (!perPack || cents < perPack.cents)) perPack = { p, cents, packs };
    }
    out.push({ label, count: rows.length, cheapest: rows[0], dearest: rows[rows.length - 1], medianCents: median(rows.map((p) => p.lowestPriceCents!)), perPack });
  }
  return out;
}

/** Pure: the newest released set (sets.ts order) with a booster box open here, and its cheapest box. */
export function newestBoxOf(products: readonly ProductCardData[], today: string): MarketReport["newestBox"] {
  for (const set of SETS) {
    if (set.releaseDate > today) continue;
    const box = products.filter((p) => p.setCode === set.code && p.productType === "Booster Box" && (p.lowestPriceCents ?? 0) > 0).sort(byPrice)[0];
    if (box) return { set, p: box };
  }
  return null;
}

/** Pure: what changed in stock between the history's last day and STOCK_WINDOW_DAYS before it, for the products given. */
export function stockMoves(h: PriceHistory | null, market: string, products: readonly ProductCardData[], window = STOCK_WINDOW_DAYS): StockMoves | null {
  if (!h || h.through - h.since < 1) return null;
  const days = Math.min(window, h.through - h.since);
  const fromDay = h.through - days;
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const cameIn: ProductCardData[] = [];
  let wentOut = 0;
  let wider = 0;
  let narrower = 0;
  let cameInCount = 0;
  for (const slug of Object.keys(h.series[market] ?? {})) {
    const p = bySlug.get(slug);
    const s = dailySeries(h, market, slug, days + 1);
    const a = s.find((d) => d.day === fromDay);
    const b = s[s.length - 1];
    if (!a || !b || b.day !== h.through) continue;
    if (a.stores === 0 && b.stores > 0) {
      cameInCount++;
      if (p) cameIn.push(p);
    }
    else if (a.stores > 0 && b.stores === 0) wentOut++;
    else if (a.stores > 0 && b.stores > a.stores) wider++;
    else if (b.stores > 0 && b.stores < a.stores) narrower++;
  }
  cameIn.sort((x, y) => y.inStockStores - x.inStockStores || x.name.localeCompare(y.name));
  return { from: isoOfDay(fromDay), to: isoOfDay(h.through), cameInCount, cameIn, wentOut, wider, narrower };
}

/** The soonest upcoming set (sets.ts) with a pre-order open here. */
export function preorderOf(products: readonly ProductCardData[], today: string): MarketReport["preorder"] {
  const upcoming = SETS.filter((s) => s.releaseDate > today).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  for (const set of upcoming) {
    const open = products.filter((p) => p.setCode === set.code && (p.inStockStores > 0 || p.marketplaceOpen) && (p.lowestPriceCents ?? 0) > 0);
    if (!open.length) continue;
    const lines = REPORT_TYPES.map((t) => open.filter((p) => p.productType === t).sort(byPrice)[0]).filter((p): p is ProductCardData => !!p);
    return { set, lines, open: open.length };
  }
  return null;
}

// ─── Sentences ───────────────────────────────────────────────────────────────

const TYPE_WORD: Record<ReportType, { one: string; many: string }> = {
  "Booster Box": { one: "booster box", many: "booster boxes" },
  "Elite Trainer Box": { one: "Elite Trainer Box", many: "Elite Trainer Boxes" },
  "Booster Bundle": { one: "booster bundle", many: "booster bundles" },
};

/** One type's range, as a sentence. */
export function rangeSentence(t: TypeRange, r: RegionInfo): string {
  const m = (c: number | null) => money(c, r.market);
  const w = TYPE_WORD[t.label];
  if (t.count === 1) return `One ${w.one} is in stock in ${r.inName} today: ${t.cheapest.name} at ${m(t.cheapest.lowestPriceCents)}.`;
  return `${plural(t.count, w.one, w.many)} ${t.count === 1 ? "is" : "are"} in stock in ${r.inName} today, from ${m(t.cheapest.lowestPriceCents)} (${t.cheapest.name}) to ${m(
    t.dearest.lowestPriceCents,
  )} (${t.dearest.name}); the middle of that range is ${m(t.medianCents)}.`;
}

/** Why the range is wide: the dearest is a multiple of the cheapest. Null when the spread is small. */
export function spreadSentence(t: TypeRange): string | null {
  const lo = t.cheapest.lowestPriceCents ?? 0;
  const hi = t.dearest.lowestPriceCents ?? 0;
  if (t.count < 3 || lo <= 0 || hi < lo * 2) return null;
  const x = Math.round((hi / lo) * 10) / 10;
  return `The dearest costs about ${x} times the cheapest, so which set it is matters far more than which store: compare one set's product across stores, not one set against another.`;
}

export function perPackSentence(types: readonly TypeRange[], r: RegionInfo): string | null {
  const withPP = types.filter((t) => t.perPack);
  if (!withPP.length) return null;
  const best = withPP.reduce((a, b) => (b.perPack!.cents < a.perPack!.cents ? b : a));
  const others = withPP.filter((t) => t !== best).map((t) => `${money(t.perPack!.cents, r.market)} in the cheapest ${TYPE_WORD[t.label].one} per pack (${t.perPack!.p.name})`);
  return `The cheapest pack in ${r.inName} today comes in ${best.perPack!.p.name}: ${money(best.perPack!.cents, r.market)} a pack for ${best.perPack!.packs} packs at ${money(
    best.perPack!.p.lowestPriceCents,
    r.market,
  )}.${others.length ? ` Against that, ${others.join(", and ")}.` : ""}`;
}

export function stockSentence(s: StockMoves | null, r: RegionInfo): string | null {
  if (!s) return null;
  const span = `between ${formatRelease(s.from)} and ${formatRelease(s.to)}`;
  if (!s.cameInCount && !s.wentOut && !s.wider && !s.narrower) return `Our daily snapshots show no change in which ${r.adjective} stores had sealed product in stock ${span}.`;
  const parts: string[] = [];
  if (s.cameInCount) parts.push(`${plural(s.cameInCount, "sealed product")} that no store we read had in stock came into stock at one or more`);
  if (s.wentOut) parts.push(`${plural(s.wentOut, "product")} went out of stock at every store`);
  if (s.wider) parts.push(`${plural(s.wider, "product")} could be bought at more stores`);
  if (s.narrower) parts.push(`${plural(s.narrower, "product")} at fewer`);
  return `${span[0].toUpperCase()}${span.slice(1)}, our daily snapshots of ${r.adjective} stores show ${parts.join("; ")}. Stock comes and goes store by store, so a product sold out at one shop can still be on another's shelf.`;
}

export function preorderSentence(p: MarketReport["preorder"], r: RegionInfo): string | null {
  if (!p) return null;
  const lines = p.lines.map((x) => `the ${TYPE_WORD[x.productType as ReportType]?.one ?? x.productType} from ${money(x.lowestPriceCents, r.market)}`);
  return `${p.set.name} releases on ${formatRelease(p.set.releaseDate)}, and ${plural(p.open, "product")} of it ${p.open === 1 ? "is" : "are"} open for pre-order in ${r.inName} today${
    lines.length ? `: ${lines.join(", ")}` : ""
  }. A pre-order price is the store's price today, charged now or at dispatch depending on the store.`;
}

// ─── The read ────────────────────────────────────────────────────────────────

/** One region's report. Capped, scoped reads only (see the top of this file). */
export async function loadMarketReport(market: Market, now: Date = new Date()): Promise<MarketReport> {
  const today = now.toISOString().slice(0, 10);
  const r = REGIONS[market.toLowerCase() as keyof typeof REGIONS];
  const upcoming = SETS.filter((s) => s.releaseDate > today).map((s) => s.code);
  const soonest = SETS.filter((s) => s.releaseDate > today).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)).map((s) => s.code).slice(0, 2);
  const [released, pre, overview] = await Promise.all([
    prisma.productStat.findMany({
      where: { market, ...OPEN, lowestPriceCents: { gt: 0 }, product: { productType: { in: [...REPORT_TYPES] }, setCode: { not: null, notIn: upcoming } } },
      take: 400,
      select: cardSelect,
    }),
    soonest.length
      ? prisma.productStat.findMany({ where: { market, ...OPEN, lowestPriceCents: { gt: 0 }, product: { setCode: { in: soonest } } }, take: 60, select: cardSelect })
      : Promise.resolve([]),
    regionOverview(market),
  ]);
  const products = released.map(toCard);
  return {
    r,
    today,
    overview: { products: overview.products, inStock: overview.inStock, stores: overview.stores },
    types: typeRanges(products),
    newestBox: newestBoxOf(products, today),
    preorder: preorderOf(pre.map(toCard), today),
    stock: stockMoves(readPriceHistory(), market, products),
  };
}

export const setOfCode = (code: string | null): PokemonSet | null => (code ? SET_BY_CODE.get(code) ?? null : null);
