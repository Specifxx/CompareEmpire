// The live numbers in the guides: small, scoped reads of the region's current ProductStat rows, made once per ISR render (the
// guide pages revalidate daily and after each import). Every read is one market, selects only what a card shows and is capped:
// a guide reads at most about 40 rows (about 20 KB) per render (src/lib/db.ts rules 1–2). No unstable_cache: the page is the cache.
//
// Sources, and nothing else: the existing loaders (calendarProducts, productsBySet, lastCheckedAt), typeSummary below (one GROUP BY,
// at most 16 rows) and, for the booster-box guide only, one query for the pack types of three sets.
import { calendarProducts, CALENDAR_TYPES, cardSelect, lastCheckedAt, OPEN, productsBySet, sortCards, toCard, type ProductCardData } from "@/lib/data";
import { cardOpen } from "@/lib/compact";
import { prisma } from "@/lib/db";
import type { Market, RegionInfo } from "@/lib/regions";
import { usMsrpCents } from "@/lib/rrp";
import type { GuideSlug } from "./index";
import { newestReleased, upcomingSets } from "./facts";

/** One product type's open listings in a market (typeSummary): in stock and on pre-order counted apart, and the in-stock from-price. */
export interface TypeSummaryRow {
  productType: string;
  /** Open products of released sets (or of no set): in stock at a store, or on TCGplayer in the US. */
  inStock: number;
  /** Open products of sets still to be released: pre-orders. */
  preorder: number;
  /** The lowest in-stock price, in the market's currency (cents). */
  fromCents: number | null;
}

/** What a guide's live blocks render. Each guide fills what it uses; the rest stays empty. */
export interface GuideData {
  /** When the region's stores were last read (ISO): the byline's and every live block's "prices checked". Null before the first import. */
  checked: string | null;
  /** The day the page rendered (YYYY-MM-DD, UTC): what "released" and "upcoming" are judged against. */
  today: string;
  /** The sets the live block covers, in the order it shows them. */
  sets: string[];
  /** Per set code: its OPEN products the block prices, cheapest first. */
  bySet: Record<string, ProductCardData[]>;
  /** Per set code: how many of its products are open (the pre-order guide's "open for pre-order" count). */
  openCount: Record<string, number>;
  /** typeSummary: per product type label. */
  types: TypeSummaryRow[];
}

export const emptyGuideData = (today: string, checked: string | null = null): GuideData => ({ checked, today, sets: [], bySet: {}, openCount: {}, types: [] });

/** The pack-bearing types the booster-box guide prices within a set: a box against a bundle and against single packs. */
export const BOX_GUIDE_TYPES = ["Booster Box", "Booster Bundle", "Sleeved Booster", "Booster Pack"];

/**
 * Per product type, the market's open listings: one GROUP BY over ProductStat ⋈ Product, at most 16 rows (one per type) and about
 * 1 KB. Products of a set not yet released count as pre-orders, the rest as in stock; the from-price is the in-stock one.
 */
export async function typeSummary(market: Market, upcoming: string[]): Promise<TypeSummaryRow[]> {
  return prisma.$queryRaw<TypeSummaryRow[]>`
    SELECT p."productType" AS "productType",
      (count(*) FILTER (WHERE NOT coalesce(p."setCode" = ANY(${upcoming}::text[]), false)))::int AS "inStock",
      (count(*) FILTER (WHERE coalesce(p."setCode" = ANY(${upcoming}::text[]), false)))::int AS "preorder",
      min(s."lowestPriceCents") FILTER (WHERE NOT coalesce(p."setCode" = ANY(${upcoming}::text[]), false)) AS "fromCents"
    FROM "ProductStat" s JOIN "Product" p ON p."id" = s."productId"
    WHERE s."market" = ${market} AND (s."inStockStores" > 0 OR s."marketplaceOpen")
    GROUP BY 1
    LIMIT 16`;
}

/** The booster-box guide's one query: the open box, bundle, sleeved booster and loose pack listings of three sets (one per set and type, so about 12 rows). */
async function packTypesOfSets(market: Market, setCodes: string[]): Promise<ProductCardData[]> {
  if (!setCodes.length) return [];
  const rows = await prisma.productStat.findMany({
    where: { market, ...OPEN, product: { setCode: { in: setCodes }, productType: { in: BOX_GUIDE_TYPES } } },
    take: 60,
    select: cardSelect,
  });
  return sortCards(rows.map(toCard));
}

const group = (cards: ProductCardData[]): Record<string, ProductCardData[]> => {
  const out: Record<string, ProductCardData[]> = {};
  for (const p of cards) if (p.setCode) (out[p.setCode] ??= []).push(p);
  return out;
};

/** The cheapest open product of each calendar type (box, ETB, bundle) among a set's products: what calendarProducts() picks. */
export function cheapestHeadline(products: ProductCardData[]): ProductCardData[] {
  const out: ProductCardData[] = [];
  for (const p of sortCards(products.filter(cardOpen))) {
    if (CALENDAR_TYPES.includes(p.productType) && !out.some((x) => x.productType === p.productType)) out.push(p);
  }
  return out;
}

/** Load what a guide's live blocks show, for one region. */
export async function loadGuideData(slug: GuideSlug, r: RegionInfo, now: Date = new Date()): Promise<GuideData> {
  const today = now.toISOString().slice(0, 10);
  const checkedAt = lastCheckedAt(r.market).then((d) => d?.toISOString() ?? null);
  const done = async (d: Omit<GuideData, "checked" | "today">): Promise<GuideData> => ({ checked: await checkedAt, today, ...d });

  switch (slug) {
    case "how-many-packs-in-pokemon-products": {
      // The newest set with headline product in stock here: the three newest released sets are read (≤ 27 rows) and the block
      // shows the newest one that has any, so a region whose stores have not stocked the newest set yet still gets a table.
      const codes = newestReleased(today, 3).map((s) => s.code);
      const bySet = Object.fromEntries(await calendarProducts(r.market, codes));
      const pick = codes.find((c) => bySet[c]?.length) ?? codes[0];
      return done({ sets: pick ? [pick] : [], bySet: pick && bySet[pick] ? { [pick]: bySet[pick] } : {}, openCount: {}, types: [] });
    }
    case "booster-box-vs-etb-vs-booster-bundle": {
      const codes = newestReleased(today, 4).map((s) => s.code); // ≤ 36 rows
      return done({ sets: codes, bySet: Object.fromEntries(await calendarProducts(r.market, codes)), openCount: {}, types: [] });
    }
    case "are-pokemon-booster-boxes-worth-it": {
      const codes = newestReleased(today, 3, (s) => !s.noBoosterBox).map((s) => s.code);
      return done({ sets: codes, bySet: group(await packTypesOfSets(r.market, codes)), openCount: {}, types: [] });
    }
    case "pokemon-sealed-products-explained": {
      const upcoming = upcomingSets(today).map((s) => s.code);
      return done({ sets: [], bySet: {}, openCount: {}, types: await typeSummary(r.market, upcoming) });
    }
    case "pokemon-tcg-msrp": {
      // US only (the route 404s elsewhere): the four newest released sets that have a US MSRP, so nothing before Scarlet & Violet.
      const codes = newestReleased(today, 4, (s) => usMsrpCents("booster-pack", s.code) != null).map((s) => s.code); // ≤ 36 rows
      return done({ sets: codes, bySet: Object.fromEntries(await calendarProducts(r.market, codes)), openCount: {}, types: [] });
    }
    case "how-to-preorder-pokemon-tcg": {
      // The two soonest upcoming sets, each read whole (productsBySet: one set in one market, typically 5–25 rows): the open count
      // and the cheapest box, ETB and bundle both come from the same rows.
      const codes = upcomingSets(today)
        .slice(0, 2)
        .map((s) => s.code);
      const lists = await Promise.all(codes.map((c) => productsBySet(r.market, c)));
      const bySet: Record<string, ProductCardData[]> = {};
      const openCount: Record<string, number> = {};
      codes.forEach((c, i) => {
        bySet[c] = cheapestHeadline(lists[i]);
        openCount[c] = lists[i].filter(cardOpen).length;
      });
      return done({ sets: codes, bySet, openCount, types: [] });
    }
  }
}
