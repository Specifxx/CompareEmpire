// Request-path reads. Every query here is scoped to one region, product, set or
// store and selects only the columns a page renders (src/lib/db.ts, rules 1–2).
// Pages that call these are ISR-cached and re-rendered once per import.
import { prisma } from "./db";
import { SET_BY_CODE, SETS } from "./sets";
import { typeRank } from "./sealed-title";
import { rankOffers } from "./sealed-offers";
import { STORE_BY_KEY } from "./stores";
import type { Market } from "./regions";

export interface ProductCardData {
  slug: string;
  name: string;
  productType: string;
  setCode: string | null;
  imageUrl: string | null;
  lowestPriceCents: number | null;
  inStockStores: number;
  listedStores: number;
  releaseDate: string | null;
}

const cardSelect = {
  lowestPriceCents: true,
  inStockStores: true,
  listedStores: true,
  product: { select: { slug: true, name: true, productType: true, setCode: true, imageUrl: true } },
} as const;

type CardRow = {
  lowestPriceCents: number | null;
  inStockStores: number;
  listedStores: number;
  product: { slug: string; name: string; productType: string; setCode: string | null; imageUrl: string | null };
};

function toCard(r: CardRow): ProductCardData {
  return {
    ...r.product,
    lowestPriceCents: r.lowestPriceCents,
    inStockStores: r.inStockStores,
    listedStores: r.listedStores,
    releaseDate: r.product.setCode ? SET_BY_CODE.get(r.product.setCode)?.releaseDate ?? null : null,
  };
}

/** In stock first (cheapest first), then sold out by type and name. */
export function sortCards(cards: ProductCardData[]): ProductCardData[] {
  return [...cards].sort((a, b) => {
    const ai = a.inStockStores > 0 ? 0 : 1;
    const bi = b.inStockStores > 0 ? 0 : 1;
    if (ai !== bi) return ai - bi;
    if (ai === 0) return (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0);
    return typeRank(a.productType) - typeRank(b.productType) || a.name.localeCompare(b.name);
  });
}

/**
 * Worth a page in the index / a tile on the browse page: something you can buy
 * now, or something at least two stores carry (so there's a comparison to make).
 * A one-store, sold-out listing is still a product page (for restock alerts),
 * reachable from its set and store — just not in the browse grid or sitemap.
 */
export const COMPARABLE = { OR: [{ inStockStores: { gt: 0 } }, { listedStores: { gte: 2 } }] };

/** The browse page's data set: every comparable product in the market. */
export async function marketProducts(market: Market): Promise<ProductCardData[]> {
  const rows = await prisma.productStat.findMany({ where: { market, ...COMPARABLE }, select: cardSelect });
  return rows.map(toCard);
}

export async function productsByType(market: Market, typeLabel: string): Promise<ProductCardData[]> {
  const rows = await prisma.productStat.findMany({
    where: { market, listedStores: { gt: 0 }, product: { productType: typeLabel } },
    select: cardSelect,
  });
  return sortCards(rows.map(toCard));
}

export async function productsBySet(market: Market, setCode: string): Promise<ProductCardData[]> {
  const rows = await prisma.productStat.findMany({
    where: { market, listedStores: { gt: 0 }, product: { setCode } },
    select: cardSelect,
  });
  return rows.map(toCard).sort((a, b) => typeRank(a.productType) - typeRank(b.productType) || a.name.localeCompare(b.name));
}

/** The cheapest in-stock products of some types — for the region home page rails. */
export async function cheapestInStock(market: Market, typeLabels: string[], take: number): Promise<ProductCardData[]> {
  const rows = await prisma.productStat.findMany({
    where: { market, inStockStores: { gt: 0 }, product: { productType: { in: typeLabels } } },
    orderBy: { lowestPriceCents: "asc" },
    take: take * 4,
    select: cardSelect,
  });
  // Favour recent sets: an old set's box is rarely the cheapest thing anyone wants.
  return rows
    .map(toCard)
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0))
    .slice(0, take);
}

const HEADLINE_TYPES = ["Booster Box", "Elite Trainer Box", "Booster Bundle", "Pokémon Center Elite Trainer Box"];

/**
 * The region home page's rails, from small targeted reads: in-stock booster
 * boxes and ETBs (newest sets first), open pre-orders, and the headline
 * products of the newest sets the region stocks.
 */
export async function homeRails(market: Market, today = new Date().toISOString().slice(0, 10)) {
  const upcoming = SETS.filter((s) => s.releaseDate > today).map((s) => s.code);
  const recentCodes = SETS.slice(0, 12).map((s) => s.code);
  const newestFirst = (a: ProductCardData, b: ProductCardData) =>
    (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || (a.lowestPriceCents ?? 0) - (b.lowestPriceCents ?? 0);
  const inStockOfType = async (type: string) =>
    (
      await prisma.productStat.findMany({
        where: { market, inStockStores: { gt: 0 }, product: { productType: type, OR: [{ setCode: null }, { setCode: { notIn: upcoming } }] } },
        take: 150,
        select: cardSelect,
      })
    )
      .map(toCard)
      .sort(newestFirst)
      .slice(0, 8);
  const [boxes, etbs, preorders, latest] = await Promise.all([
    inStockOfType("Booster Box"),
    inStockOfType("Elite Trainer Box"),
    upcoming.length
      ? prisma.productStat.findMany({ where: { market, inStockStores: { gt: 0 }, product: { setCode: { in: upcoming } } }, take: 60, select: cardSelect })
      : Promise.resolve([]),
    prisma.productStat.findMany({
      where: { market, listedStores: { gt: 0 }, product: { setCode: { in: recentCodes }, productType: { in: HEADLINE_TYPES } } },
      select: cardSelect,
    }),
  ]);
  const bySet = new Map<string, ProductCardData[]>();
  for (const p of latest.map(toCard)) (bySet.get(p.setCode!) ?? bySet.set(p.setCode!, []).get(p.setCode!)!).push(p);
  return { boxes, etbs, preorders: sortCards(preorders.map(toCard)).slice(0, 8), latestSets: bySet };
}

export interface RegionOverview {
  products: number;
  inStock: number;
  stores: number;
  storesRead: number;
  lastChecked: Date | null;
}

export async function regionOverview(market: Market): Promise<RegionOverview> {
  const [products, inStock, stores] = await Promise.all([
    prisma.productStat.count({ where: { market, listedStores: { gt: 0 } } }),
    prisma.productStat.count({ where: { market, inStockStores: { gt: 0 } } }),
    prisma.storeStat.aggregate({ where: { market, listed: { gt: 0 } }, _count: { _all: true }, _max: { lastOkAt: true } }),
  ]);
  const read = await prisma.storeStat.count({ where: { market } });
  return { products, inStock, stores: stores._count._all, storesRead: read, lastChecked: stores._max.lastOkAt ?? null };
}

export async function allRegionOverviews(): Promise<Record<string, { products: number; inStock: number; stores: number }>> {
  const [listed, open, stores] = await Promise.all([
    prisma.productStat.groupBy({ by: ["market"], where: { listedStores: { gt: 0 } }, _count: { _all: true } }),
    prisma.productStat.groupBy({ by: ["market"], where: { inStockStores: { gt: 0 } }, _count: { _all: true } }),
    prisma.storeStat.groupBy({ by: ["market"], where: { listed: { gt: 0 } }, _count: { _all: true } }),
  ]);
  const out: Record<string, { products: number; inStock: number; stores: number }> = {};
  for (const r of listed) (out[r.market] ??= { products: 0, inStock: 0, stores: 0 }).products = r._count._all;
  for (const r of open) (out[r.market] ??= { products: 0, inStock: 0, stores: 0 }).inStock = r._count._all;
  for (const r of stores) (out[r.market] ??= { products: 0, inStock: 0, stores: 0 }).stores = r._count._all;
  return out;
}

export interface OfferView {
  store: string;
  storeName: string;
  storeHost: string;
  title: string;
  url: string;
  priceCents: number;
  inStock: boolean;
  lastSeen: string;
}

export interface ProductPageData {
  id: string;
  slug: string;
  name: string;
  productType: string;
  setCode: string | null;
  imageUrl: string | null;
  offers: OfferView[];
  stats: { market: string; lowestPriceCents: number | null; inStockStores: number; listedStores: number }[];
}

export async function productPage(slug: string, market: Market): Promise<ProductPageData | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      productType: true,
      setCode: true,
      imageUrl: true,
      offers: {
        where: { market },
        take: 80,
        select: { store: true, title: true, url: true, priceCents: true, inStock: true, lastSeen: true },
      },
      stats: { select: { market: true, lowestPriceCents: true, inStockStores: true, listedStores: true } },
    },
  });
  if (!p) return null;
  const offers = rankOffers(
    p.offers.map((o) => {
      const s = STORE_BY_KEY.get(o.store);
      return {
        store: o.store,
        storeName: s?.name ?? o.store,
        storeHost: s ? s.base.replace(/^https?:\/\/(www\.)?/, "") : "",
        title: o.title,
        url: o.url,
        priceCents: o.priceCents,
        inStock: o.inStock,
        lastSeen: o.lastSeen.toISOString(),
      };
    }),
  );
  return { ...p, offers };
}

export async function storeOffers(store: string) {
  const rows = await prisma.offer.findMany({
    where: { store },
    orderBy: [{ inStock: "desc" }, { priceCents: "asc" }],
    take: 400,
    select: {
      priceCents: true,
      inStock: true,
      lastSeen: true,
      url: true,
      product: { select: { slug: true, name: true, productType: true, setCode: true, imageUrl: true } },
    },
  });
  return rows;
}

export async function storeStats(market: Market) {
  return prisma.storeStat.findMany({
    where: { market },
    select: { store: true, listed: true, inStock: true, lastOkAt: true, lastError: true },
  });
}

export async function storeStat(store: string) {
  return prisma.storeStat.findUnique({ where: { store }, select: { listed: true, inStock: true, lastOkAt: true, lastError: true } });
}

/** Per set: how many products the market lists and how many are in stock. */
export async function setCounts(market: Market): Promise<Map<string, { products: number; inStock: number }>> {
  const rows = await prisma.productStat.findMany({
    where: { market, listedStores: { gt: 0 }, product: { setCode: { not: null } } },
    select: { inStockStores: true, product: { select: { setCode: true } } },
  });
  const out = new Map<string, { products: number; inStock: number }>();
  for (const r of rows) {
    const code = r.product.setCode!;
    const c = out.get(code) ?? { products: 0, inStock: 0 };
    c.products++;
    if (r.inStockStores > 0) c.inStock++;
    out.set(code, c);
  }
  return out;
}

/** Other products from the same set in this market (product page, "more from"). */
export async function relatedProducts(market: Market, setCode: string, excludeSlug: string, take = 8): Promise<ProductCardData[]> {
  const rows = await prisma.productStat.findMany({
    where: { market, listedStores: { gt: 0 }, product: { setCode, slug: { not: excludeSlug } } },
    take: 40,
    select: cardSelect,
  });
  return sortCards(rows.map(toCard)).slice(0, take);
}

/** Which product types each market lists (sitemap: no links to empty type pages). */
export async function typesByMarket(): Promise<Map<string, Set<string>>> {
  // GROUP BY in SQL: Prisma's `distinct` dedupes client-side after fetching every row.
  const rows = await prisma.$queryRaw<{ market: string; productType: string }[]>`
    SELECT s."market", p."productType" FROM "ProductStat" s JOIN "Product" p ON p."id" = s."productId"
    WHERE s."listedStores" > 0 GROUP BY 1, 2`;
  const out = new Map<string, Set<string>>();
  for (const r of rows) (out.get(r.market) ?? out.set(r.market, new Set()).get(r.market)!).add(r.productType);
  return out;
}

/** Everything the sitemap lists: products with a store listing, per market. */
export async function sitemapEntries(): Promise<{ market: string; slug: string }[]> {
  const rows = await prisma.productStat.findMany({
    where: COMPARABLE,
    select: { market: true, product: { select: { slug: true } } },
  });
  return rows.map((r) => ({ market: r.market, slug: r.product.slug }));
}
