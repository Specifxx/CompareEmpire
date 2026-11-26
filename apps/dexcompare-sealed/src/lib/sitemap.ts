// The sitemap's URL lists, as pure functions of data the route (src/app/sitemap.ts)
// reads. Kept apart from the queries so tests/sitemap.test.ts can check every
// URL is on SITE_URL without a database.
//
// Layout (Next's generateSitemaps): /sitemap.xml is the index; /sitemap/0.xml
// is the static pages and every store page; /sitemap/1.xml … /sitemap/7.xml
// is one region each — its types, sets and comparable products.
import type { MetadataRoute } from "next";
import { guidesFor } from "../content/guides";
import { COUNTRY_GUIDE } from "../content/guides/country-prices";
import { TOOLS, toolIndexed, toolsIndexIndexed } from "../content/tools";
import { openPreorderGuides } from "./preorder-guides";
import { REGION_LIST, REGIONS, regionOfMarket, type Region, type RegionInfo } from "./regions";
import { JAPANESE_TYPES, PRODUCT_TYPES } from "./sealed-title";
import { SETS } from "./sets";
import { SITE_URL } from "./site";
import { STORES } from "./stores";
import { detailIndexed } from "./index-tiers";
import { readPriceHistory } from "./price-history";
import { publishedWeeks } from "./weekly-chart";
import { withoutOffSeasonSales } from "@/lib/sale-seasons";

export const STATIC_SITEMAP_ID = 0;

/** Whether each store's own page is listed (off since 2026-11-07; see staticSitemap). */
export const SITEMAP_STORE_PAGES = false;

/**
 * /sitemap/<id>.xml per region: au=1, us=2, uk=3, ca=4, nz=5, eu=6, sg=7. Frozen (submitted to Search Console), so it no longer
 * follows REGION_LIST, which leads with the US since the US-first switch (owner, 2026-11-22).
 */
const SITEMAP_REGION_ORDER: readonly Region[] = ["au", "us", "uk", "ca", "nz", "eu", "sg"];
export function sitemapIdOf(region: Region): number {
  return SITEMAP_REGION_ORDER.indexOf(region) + 1;
}

export function regionOfSitemapId(id: number): RegionInfo | null {
  const r = SITEMAP_REGION_ORDER[id - 1];
  return r ? REGIONS[r] : null;
}

export const SITEMAP_IDS: { id: number }[] = [{ id: STATIC_SITEMAP_ID }, ...SITEMAP_REGION_ORDER.map((r) => ({ id: sitemapIdOf(r) }))];

const url = (path: string, lastModified: Date | null | undefined, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], priority: number): MetadataRoute.Sitemap[number] => ({
  url: `${SITE_URL}${path}`,
  ...(lastModified ? { lastModified } : {}),
  changeFrequency,
  priority,
});

/**
 * The static pages, each region's landing pages (its pre-order pages
 * included, while their set is upcoming) and every store page.
 * `lastmod` is each market's last import (StoreStat max(updatedAt) — a
 * current-state column, not history). `activeStores`, when given, is the keys
 * of the stores worth indexing (hub-data.ts activeStoreKeys: something listed,
 * not dormant); a store outside it is noindex and gets no URL here. Without it
 * (the build, with no database) every store is listed.
 */
export function staticSitemap(
  lastmod: Partial<Record<string, Date | null>>,
  activeStores?: Iterable<string>,
  today = new Date().toISOString().slice(0, 10),
  thin: Partial<Record<Region, readonly string[]>> = {},
): MetadataRoute.Sitemap {
  const active = activeStores ? new Set(activeStores) : null;
  const out: MetadataRoute.Sitemap = [
    url("", null, "daily", 1),
    url("/about", null, "monthly", 0.3),
    url("/premium", null, "monthly", 0.4),
    url("/premium/restock-alerts", null, "monthly", 0.4),
    url("/widgets", null, "monthly", 0.3),
    url("/creators", null, "monthly", 0.4),
    url("/terms", null, "yearly", 0.1),
    url("/privacy", null, "yearly", 0.1),
    url("/contact", null, "yearly", 0.1),
    url("/how-we-pick-stores", null, "monthly", 0.3),
    url("/methodology", null, "monthly", 0.3),
    url("/list-your-store", null, "monthly", 0.3),
    url("/advertise", null, "monthly", 0.2),
    url("/affiliate-disclosure", null, "yearly", 0.1),
  ];
  for (const r of REGION_LIST) {
    const m = lastmod[r.market];
    out.push(url(`/${r.region}`, m, "daily", 0.9));
    out.push(url(`/${r.region}/sealed`, m, "daily", 0.8));
    out.push(url(`/${r.region}/releases`, m, "weekly", 0.6));
    out.push(url(`/${r.region}/sets`, m, "weekly", 0.6));
    out.push(url(`/${r.region}/stores`, m, "weekly", 0.5));
    // The pages built from each import's current state (deals, price per pack, the week's digest) change with it. The guides index
    // changes only when a guide is added or edited, so the import time would be a false lastmod there: it has none.
    // `thin` (lib/section-thin.ts): the section pages that are noindex today, left out so the sitemap never lists a noindex URL.
    const skip = new Set(thin[r.region] ?? []);
    if (!skip.has("/deals")) out.push(url(`/${r.region}/deals`, m, "daily", 0.7));
    out.push(url(`/${r.region}/black-friday`, m, "daily", 0.7));
    out.push(url(`/${r.region}/cyber-monday`, m, "daily", 0.7));
    // The seasonal sale pages (DECISIONS.md, "Seasonal sale pages"): always listed, so they are indexed before each event.
    for (const p of withoutOffSeasonSales(["/boxing-day", "/january-sales"], new Date().toISOString().slice(0, 10))) out.push(url(`/${r.region}${p}`, m, "daily", 0.6));
    if (!skip.has("/cheapest-packs")) out.push(url(`/${r.region}/cheapest-packs`, m, "daily", 0.6));
    out.push(url(`/${r.region}/this-week`, m, "daily", 0.5));
    // The Ultra-Premium Collection hub (2026-11-13): every UPC, the 30th Celebration Day and Night boxes first.
    out.push(url(`/${r.region}/ultra-premium-collections`, m, "daily", 0.7));
    // The stock pages (lib/stock.ts): back in stock and price moves are built from the daily price history, older sets from today's
    // stock; all change with each import.
    out.push(url(`/${r.region}/back-in-stock`, m, "daily", 0.6));
    if (!skip.has("/price-moves")) out.push(url(`/${r.region}/price-moves`, m, "daily", 0.5));
    out.push(url(`/${r.region}/out-of-print`, m, "daily", 0.6));
    // The Price Duel (lib/daily.ts): a new puzzle a day.
    out.push(url(`/${r.region}/daily`, m, "daily", 0.5));
    out.push(url(`/${r.region}/guides`, null, "weekly", 0.5));
    // Pre-order pages, until release day (they are noindexed from then on: lib/preorder-guides.ts).
    for (const { set } of openPreorderGuides(today, r.region)) out.push(url(`/${r.region}/preorders/${set.slug}`, m, "daily", 0.8));
  }
  // Store pages are out of the sitemap since 2026-11-07 (SITEMAP_STORE_PAGES): nobody searches a shop's page on a comparison
  // site, and ~900 of them were a seventh of the sitemap while Google read a few URLs a day. They stay indexable, linked from
  // each region's /stores directory (which stays listed).
  for (const s of SITEMAP_STORE_PAGES ? STORES : []) {
    if (active && !active.has(s.key)) continue;
    const r = regionOfMarket(s.market);
    if (r) out.push(url(`/${r.region}/stores/${s.key}`, lastmod[s.market], "daily", 0.4));
  }
  // Every guide, in each region it is offered in (the registry is pure: no database read). No lastmod: a guide's live blocks
  // change with each import, but its text only when it is edited.
  // The weekly charts (lib/weekly-chart.ts): every published week, in the indexed regions. A week's page never changes once it ends.
  const history = readPriceHistory();
  for (const r of REGION_LIST) for (const w of detailIndexed(r.region) ? publishedWeeks(history, r.market) : []) out.push(url(`/${r.region}/charts/${w}`, new Date(`${w}T00:00:00Z`), "weekly", 0.5));
  for (const r of REGION_LIST) for (const g of detailIndexed(r.region) ? guidesFor(r.region) : []) out.push(url(`/${r.region}/guides/${g.slug}`, null, "weekly", 0.6));
  // The tools (src/content/tools): each tool in its TOOL_INDEX_REGIONS only, and the index where one is (2026-11-24). No lastmod:
  // their copy changes only when edited.
  for (const r of REGION_LIST) {
    if (toolsIndexIndexed(r.region)) out.push(url(`/${r.region}/tools`, null, "monthly", 0.5));
    for (const t of TOOLS) if (toolIndexed(r.region, t)) out.push(url(`/${r.region}/tools/${t.slug}`, null, "monthly", 0.6));
  }
  // The one guide that compares every market, at its single region-less URL.
  out.push(url(COUNTRY_GUIDE.path, null, "weekly", 0.6));
  return out;
}

export interface RegionSitemapData {
  /** Product type labels ("Booster Box") with a comparable product in the market. */
  typeLabels: Iterable<string>;
  /** Set codes with a comparable product in the market. */
  setCodes: Iterable<string>;
  /** Slugs of the market's comparable products (data.ts COMPARABLE). */
  productSlugs: Iterable<string>;
  /** Pokémon hubs (lib/pokemon-hubs.ts) with POKEMON_INDEX_MIN comparable products; empty outside INDEXED_DETAIL_REGIONS. */
  pokemonSlugs?: Iterable<string>;
  /** The market's last import: the lastmod of a page `changed` has no date for. */
  lastmod: Date | null;
  /** When each product, set and type page last really changed (sitemapChanges below), from the daily price history. */
  changed?: SitemapChanges;
}

/** The day each page's headline last changed, as dates at 00:00 UTC. */
export interface SitemapChanges {
  /** Product slug → the day its cheapest in-stock price or its count of stores with stock last changed. */
  products: ReadonlyMap<string, Date>;
  /** Set code → the latest such day among the set's products in the market. */
  sets: ReadonlyMap<string, Date>;
  /** Product type label → the latest such day among the type's products in the market. */
  types: ReadonlyMap<string, Date>;
}

/**
 * Real lastmod dates for one market (2026-11-17, ported from MTG Compare #143). Until then every product, set and type URL carried
 * the import's own time, so every URL said "changed today" twice a day whether or not a price had moved: a date a crawler learns to
 * ignore. The price history is change-points: a product's last point is the day its cheapest in-stock price or its in-stock store
 * count last changed, which is what its page leads with. A set or type page changed on the latest of its products' days.
 * A slug with no series gets no date here (the caller falls back to the import time).
 */
export function sitemapChanges(rows: Iterable<{ slug: string; setCode: string | null; productType: string }>, series: Record<string, readonly (readonly [number, ...unknown[]])[]> | undefined): SitemapChanges {
  const products = new Map<string, Date>();
  const sets = new Map<string, Date>();
  const types = new Map<string, Date>();
  const later = (m: Map<string, Date>, k: string, d: Date) => {
    const cur = m.get(k);
    if (!cur || cur < d) m.set(k, d);
  };
  for (const r of rows) {
    const points = series?.[r.slug];
    const day = points?.length ? points[points.length - 1][0] : null;
    if (typeof day !== "number" || !Number.isFinite(day)) continue;
    const d = new Date(day * 86_400_000);
    products.set(r.slug, d);
    if (r.setCode) later(sets, r.setCode, d);
    later(types, r.productType, d);
  }
  return { products, sets, types };
}

/** One region's type, set and product pages. Unknown labels and codes are skipped, never guessed. */
export function regionSitemap(r: RegionInfo, d: RegionSitemapData): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  const labels = new Set(d.typeLabels);
  const typeDay = (label: string) => d.changed?.types.get(label) ?? d.lastmod;
  for (const t of PRODUCT_TYPES) if (labels.has(t.label)) out.push(url(`/${r.region}/type/${t.slug}`, typeDay(t.label), "daily", 0.7));
  // The Japanese section: its hub and type pages, only where the market lists a Japanese product (the hub is noindex without one).
  const japanese = JAPANESE_TYPES.filter((t) => labels.has(t.label));
  if (japanese.length) out.push(url(`/${r.region}/japanese`, d.lastmod, "daily", 0.7));
  for (const t of japanese) out.push(url(`/${r.region}/type/${t.slug}`, typeDay(t.label), "daily", 0.6));
  const codes = new Set(d.setCodes);
  for (const s of SETS) if (codes.has(s.code)) out.push(url(`/${r.region}/sets/${s.slug}`, d.changed?.sets.get(s.code) ?? d.lastmod, "daily", 0.6));
  const pokemon = [...(d.pokemonSlugs ?? [])];
  if (pokemon.length) out.push(url(`/${r.region}/pokemon`, d.lastmod, "daily", 0.6));
  for (const slug of pokemon) out.push(url(`/${r.region}/pokemon/${slug}`, d.lastmod, "daily", 0.6));
  for (const slug of d.productSlugs) out.push(url(`/${r.region}/p/${slug}`, d.changed?.products.get(slug) ?? d.lastmod, "daily", 0.7));
  return out;
}
