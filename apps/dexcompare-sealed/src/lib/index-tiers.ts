// Which product pages Google is asked to index, and which the sitemap lists (2026-10-25, Search Console: 5,332 URLs "Crawled -
// currently not indexed", 194 indexed, from a sitemap of ~9,100 URLs of which 7,907 were product pages). Pure: tests/index-tiers.test.ts.
//
// THREE TIERS, from the import's ProductStat row for the product in one market:
//   • strong: something to compare here. In stock at two or more stores; or in stock at one that three or more list; or a headline
//     product (a booster box, an ETB, a bundle, a UPC) that three or more stores list, in stock or not: people search for those
//     even when they are sold out. In the sitemap, indexable.
//   • thin: fewer than two listings to compare (one store, or only the marketplace, or one store and nothing else). Noindex and out
//     of the sitemap: the page is one row of a store's shelf inside the site's template, which is what Google declined to index.
//     It stays reachable (links, the region chips) for a visitor who wants it.
//   • middle: everything else (sold out at the two or more stores that list it; in stock at one of two). Indexable but out of the
//     sitemap for now: Google finds them through the set, type and store pages. Promote them by loosening `productTier` once the
//     strong pages are indexed; the sitemap and the page's robots tag both follow this one function, so they cannot disagree.
//
// A listing is a store that lists the product (listedStores, which never counts TCGplayer) or an open marketplace offer
// (marketplaceOpen: TCGplayer in the US). Nothing here is a guess: every number is a count the import wrote.

export type IndexTier = "strong" | "middle" | "thin";

/** The product types searched for by name even when sold out (lib/stock.ts MOVE_TYPES, the headline formats). */
export const HEADLINE_TYPES: readonly string[] = ["Booster Box", "Elite Trainer Box", "Pokémon Center Elite Trainer Box", "Booster Bundle", "Ultra-Premium Collection"];

export interface TierStat {
  inStockStores: number;
  listedStores: number;
  marketplaceOpen: boolean;
}

/** Listings a visitor can compare: the stores that list it, plus an open marketplace offer. */
export const listings = (s: TierStat): number => s.listedStores + (s.marketplaceOpen ? 1 : 0);

// 2026-11-07 (the owner's Search Console and Bing audit: thousands of region pages "Crawled" or "Discovered – currently not
// indexed"): a region page needs three listings to be indexed (one or two stores is a shelf, not a comparison, and the same
// product exists in seven regions), and the sitemap lists only the core of the strong tier: three or more stores with it in
// stock, or a headline product five or more stores list. Every page stays live and linked; hreflang already advertises only
// the regions where the page is indexable (regionAlternates). DECISIONS.md, 2026-11-07.

/** A region page with fewer listings than this is thin: noindex, out of the sitemap and out of hreflang. */
export const MIN_INDEX_LISTINGS = 3;
/** In stock at this many stores: strong (in the sitemap). */
export const STRONG_IN_STOCK = 3;
/** A headline product this many stores list, in stock or not: strong. */
export const STRONG_HEADLINE_LISTED = 5;

export function productTier(s: TierStat, productType: string): IndexTier {
  if (listings(s) < MIN_INDEX_LISTINGS) return "thin";
  if (s.inStockStores >= STRONG_IN_STOCK) return "strong";
  if (HEADLINE_TYPES.includes(productType) && s.listedStores >= STRONG_HEADLINE_LISTED) return "strong";
  return "middle";
}

/**
 * The regions whose product, guide and tool pages Google is asked to index (owner, 2026-11-08, after the Search Console audit:
 * a new site with no outside links offering seven near-identical regional copies of every product and guide gets cautious
 * treatment). NZ, SG and EU keep every page for visitors, but their product, guide and tool pages are `noindex`, out of the
 * sitemap and out of every hreflang set. Their home, sealed, set and type hubs stay indexable. Add a region back once the core
 * is indexed (recheck ~2026-11-25).
 */
export const INDEXED_DETAIL_REGIONS: readonly string[] = ["us", "au", "uk", "ca"];
export const detailIndexed = (region: string): boolean => INDEXED_DETAIL_REGIONS.includes(region);

/** Noindex: no stats row in this market, or a thin one. */
export const productNoindex = (s: TierStat | null | undefined, productType: string): boolean => !s || productTier(s, productType) === "thin";

/**
 * The sitemap's product cap per region (2026-11-07). Search Console had 79 of 81 sampled sitemap URLs as "unknown to Google":
 * after the 5xx months and the October host moves, Google crawls this site a few pages a day, and a 6,400-URL sitemap spread
 * that across store pages and long-tail products. The sitemap now names each region's most-stocked strong products only
 * (`sitemapProductSlugs`); every other strong or middle page stays indexable and linked, just not listed. Widen these once
 * Search Console shows most listed product pages "Indexed" (recheck ~2026-11-25).
 */
export const SITEMAP_PRODUCTS: Record<string, number> = { US: 300, CA: 200, AU: 200, UK: 150, EU: 0, NZ: 0, SG: 0 };

/** The region's strong products, most in-stock stores first (then most listed), capped at SITEMAP_PRODUCTS. */
export function sitemapProductSlugs(market: string, rows: { slug: string; productType: string; s: TierStat }[]): string[] {
  return rows
    .filter((r) => productInSitemap(r.s, r.productType))
    .sort((a, b) => b.s.inStockStores - a.s.inStockStores || b.s.listedStores - a.s.listedStores || a.slug.localeCompare(b.slug))
    .slice(0, SITEMAP_PRODUCTS[market] ?? 0)
    .map((r) => r.slug);
}

/** In the sitemap: strong only (and within the region's cap, sitemapProductSlugs). */
export const productInSitemap = (s: TierStat, productType: string): boolean => productTier(s, productType) === "strong";

/**
 * Set and type pages: in the sitemap from MIN_HUB_PRODUCTS comparable products in the market (a set with one or two products here is a
 * thin page that mostly repeats those products' own). Fewer, but some: indexable, out of the sitemap. None at all: a 404 (the page has
 * nothing to show; it used to be an empty 200 that Search Console called a soft 404).
 */
export const MIN_HUB_PRODUCTS = 3;
