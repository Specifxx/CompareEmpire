import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { SETS } from "@/lib/constants";
import { getArticles } from "@/lib/articles";
import { FEATURED_RESTOCKS } from "@/lib/restocks";
import { getSealedGroups } from "@/lib/sealed-import";
import { indexableSpeciesSlugs } from "@/lib/pokemon-species-data";
import { FACET_KINDS, listFacetValues, pricedCountForFacet, MIN_PRICED_TO_INDEX_FACET } from "@/lib/card-facets";
import { RETAILER_LIST } from "@/lib/retailers";

// Daily revalidation, deliberately NOT hourly.
//
// Bucket 1 is the largest cached read on the site (~20k rows × ~165 B ≈ 3.3 MB per
// regenerate). At revalidate=3600 a once-an-hour bot fetch alone cost ~79 MB/day of
// Neon transfer — a material share of a 5 GB/month allowance that has now been
// exhausted twice. Hourly bought nothing real either: prices only change when the
// daily importer runs, and /card/[id] itself is cached for 24h, so a sitemap
// lastmod could never be more than a day ahead of the page it points at.
// This one line is a ~24x reduction on the biggest cached read.
export const revalidate = 86400;

/**
 * Three child sitemaps — one per content bucket.
 * generateSitemaps() with multiple ids makes Next.js serve EACH child directly
 * at /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml — there is NO automatic
 * combining index at the bare /sitemap.xml (a wrong assumption in a previous
 * version of this comment left /sitemap.xml a live 404 with nothing pointing
 * at the real files). robots.ts lists all three child URLs directly instead.
 *
 *   0 → static routes + guides + blog + sets + market wraps  (stable, low churn)
 *   1 → card singles pages          (~20 k URLs, daily price updates)
 *   2 → sealed product pages        (~500 URLs, daily price updates)
 *   3 → Pokémon species hubs        (/pokemon/{slug} — grows with catalog coverage)
 */
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // No history DB anymore (see the "zero history" decision), so there's no
  // cheap honest "last price snapshot day" signal to stamp price-bearing pages
  // with — they simply carry no lastModified rather than a fake one.

  // ── Sitemap 0: static routes + content + sets ──────────────────────────────
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
      { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
      { url: `${SITE_URL}/sets`, changeFrequency: "weekly", priority: 0.85 },
      { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85 },
      { url: `${SITE_URL}/deals`, changeFrequency: "daily", priority: 0.85 },
      { url: `${SITE_URL}/card-value`, changeFrequency: "daily", priority: 0.85 },
      { url: `${SITE_URL}/most-valuable`, changeFrequency: "daily", priority: 0.8 },
      { url: `${SITE_URL}/trending`, changeFrequency: "daily", priority: 0.8 },
      { url: `${SITE_URL}/tools`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/tools/arbitrage`, changeFrequency: "daily", priority: 0.8 },
      { url: `${SITE_URL}/tools/net-proceeds`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/tools/grade-ev`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/tools/box-ev`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/bulk-pricer`, changeFrequency: "monthly", priority: 0.65 },
      { url: `${SITE_URL}/tools/best-basket`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/restock`, changeFrequency: "daily", priority: 0.85 },
      { url: `${SITE_URL}/forum`, changeFrequency: "daily", priority: 0.6 },
      ...FEATURED_RESTOCKS.map((p) => ({
        url: `${SITE_URL}/restock/${p.slug}`,
        changeFrequency: "hourly" as const,
        priority: 0.85,
      })),
      { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/learn`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${SITE_URL}/support`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/explore-features`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/stores`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/stores/suggest`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${SITE_URL}/cards`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/widgets`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${SITE_URL}/trade`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ];

    // Guides + blog articles — evergreen with real publish dates (file-based, no DB).
    const contentRoutes: MetadataRoute.Sitemap = [
      ...getArticles("guide").map((a) => ({
        url: `${SITE_URL}/guides/${a.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        lastModified: new Date(`${a.date}T09:00:00+10:00`),
      })),
      ...getArticles("blog").map((a) => ({
        url: `${SITE_URL}/blog/${a.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.65,
        lastModified: new Date(`${a.date}T09:00:00+10:00`),
      })),
    ];

    const setRoutes: MetadataRoute.Sitemap = SETS.filter((s) => !s.comingSoon).map((s) => ({
      url: `${SITE_URL}/sets/${s.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));

    // Individual store profile pages — one per configured retailer. Bounded by
    // RETAILER_LIST size (~86 today), never grows with card catalogue size.
    const storeRoutes: MetadataRoute.Sitemap = RETAILER_LIST.map((r) => ({
      url: `${SITE_URL}/stores/${r.key}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));

    // Faceted card hubs (type/rarity/printing/era) — only the ones that clear
    // MIN_PRICED_TO_INDEX_FACET, mirroring each hub's own generateMetadata.
    // This is the one DB-dependent part of an otherwise fully static bucket
    // (routes/content/sets are all file- or constant-derived) — degrade to no
    // facet routes rather than fail the whole bucket if the DB is briefly
    // unreachable at build/ISR time.
    let facetRoutes: MetadataRoute.Sitemap = [];
    try {
      const facetGroups = await Promise.all(FACET_KINDS.map((k) => listFacetValues(k)));
      const facetChecks = await Promise.all(
        facetGroups.flat().map(async (f) => ({ f, priced: await pricedCountForFacet(f.where) }))
      );
      facetRoutes = facetChecks
        .filter((c) => c.priced >= MIN_PRICED_TO_INDEX_FACET)
        .map(({ f }) => ({
          url: `${SITE_URL}/cards/${f.kind}/${f.slug}`,
          changeFrequency: "daily" as const,
          priority: 0.65,
        }));
    } catch {
      facetRoutes = [];
    }

    return [...staticRoutes, ...contentRoutes, ...setRoutes, ...storeRoutes, ...facetRoutes];
  }

  // ── Sitemap 1: card singles (~20 k URLs) ──────────────────────────────────
  if (id === 1) {
    // FAIL LOUDLY on DB errors — never `return []`. An empty array serializes
    // as a VALID 200 <urlset/>, so a transient Neon blip at any hourly ISR
    // revalidation used to silently REPLACE the 20k-URL sitemap with an empty
    // one that Google accepts as "Success — 0 pages discovered" (the exact GSC
    // symptom this site had). Throwing instead makes ISR keep serving the last
    // good cached copy (and fails the build loudly rather than shipping an
    // empty sitemap).
    //
    // Three-tier indexability (documented once here — card/[id]/page.tsx's
    // generateMetadata mirrors this exactly, so a URL's sitemap presence and
    // its own <meta robots> always agree):
    //   1. hasLivePrice (a real live store match)            → indexed, priority 0.8
    //   2. no live price, but a real TCGplayer market guide  → indexed, priority 0.55
    //   3. neither                                            → noindex — EXCLUDED here
    // A card moves between tiers automatically as the importer prices it or
    // TCGplayer guides it — no separate promotion job needed, this bucket is
    // just re-queried on every ISR regenerate.
    let cards: { id: string; slug: string | null; lowestPriceCents: number | null; marketPriceSource: string | null; imageUrl: string | null }[];
    try {
      cards = await prisma.card.findMany({
        where: { OR: [{ hasLivePrice: true }, { marketPriceSource: "TCGplayer" }] },
        select: { id: true, slug: true, lowestPriceCents: true, marketPriceSource: true, imageUrl: true },
        orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
      });
    } catch {
      // DB unreachable (e.g. Neon transfer allowance exhausted) — an empty child
      // sitemap is the right degradation here; never fail the build over it.
      return [];
    }
    // Zero priced cards while the DB IS reachable means the catalogue was seeded
    // but the price importer hasn't run yet.
    //
    // This used to `throw`, which turned a transient DATA state into a hard
    // BUILD failure: Next prerenders this route, so the throw aborted
    // `next build` and blocked every Vercel deploy — including the very deploys
    // carrying the fix. That trade is backwards. An unpriced catalogue costs a
    // thin sitemap for a few hours (Google retains already-discovered URLs);
    // a failed build costs the entire site.
    //
    // So: loud in the build log, but the deploy proceeds. The next importer run
    // fills this bucket and the daily ISR regenerate publishes it.
    if (cards.length === 0) {
      console.error(
        "[sitemap] card bucket resolved to 0 indexable cards — the DB is reachable but no card " +
          "has a live price or a TCGplayer guide yet. Publishing an empty bucket; run the price " +
          "importer (scripts/import-prices.ts) to populate it."
      );
      return [];
    }
    return cards.map((c) => ({
      url: `${SITE_URL}/card/${c.slug ?? c.id}`,
      changeFrequency: "daily" as const,
      priority: c.lowestPriceCents != null ? 0.8 : c.marketPriceSource === "TCGplayer" ? 0.55 : 0.6,
      // Image sitemap: surface each card's unique art to image search (absolute URLs only).
      ...(c.imageUrl && c.imageUrl.startsWith("http") ? { images: [c.imageUrl] } : {}),
    }));
  }

  // ── Sitemap 2: sealed product pages (~500 URLs) ────────────────────────────
  if (id === 2) {
    // Same fail-loud policy as bucket 1 (see the try/catch there for why DB-
    // unreachable is handled separately from a genuine empty catalogue).
    let sealed: Awaited<ReturnType<typeof getSealedGroups>>;
    try {
      sealed = await getSealedGroups("AU");
    } catch {
      return [];
    }
    const seenSlugs = new Set<string>();
    const routes: MetadataRoute.Sitemap = [];
    for (const g of sealed) {
      if (seenSlugs.has(g.slug)) continue;
      seenSlugs.add(g.slug);
      routes.push({
        url: `${SITE_URL}/sealed/${g.slug}`,
        changeFrequency: "daily" as const,
        priority: g.lowestPriceCents != null ? 0.75 : 0.55,
      });
    }
    // Same reasoning as bucket 1: loud, but never fail the build. This route is
    // prerendered, so throwing here would abort `next build` and block deploys
    // whenever a sealed scrape happened to come back empty.
    if (routes.length === 0) {
      console.error(
        "[sitemap] sealed bucket resolved to 0 products — publishing an empty bucket. " +
          "Run the sealed importer (scripts/import-sealed.ts) to populate it."
      );
    }
    return routes;
  }

  // ── Sitemap 3: Pokémon species hubs (/pokemon/{slug}) ─────────────────────
  if (id === 3) {
    let slugs: string[];
    try {
      slugs = await indexableSpeciesSlugs();
    } catch {
      return [];
    }
    // Unlike buckets 1/2, an empty result here is a legitimate early state (no
    // species has cleared MIN_PRICED_PRINTINGS_TO_INDEX yet) — don't throw.
    return slugs.map((slug) => ({
      url: `${SITE_URL}/pokemon/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
  }

  return [];
}
