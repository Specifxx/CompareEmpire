import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { SETS } from "@/lib/constants";
import { getArticles } from "@/lib/articles";
import { FEATURED_RESTOCKS } from "@/lib/restocks";
import { getSealedGroups } from "@/lib/sealed-import";
import { indexableCharacterSlugs } from "@/lib/op-character-data";
import { FACET_KINDS, listFacetValues, pricedCountForFacet, MIN_PRICED_TO_INDEX_FACET } from "@/lib/card-facets";
import { RETAILER_LIST } from "@/lib/retailers";

// Regenerate at most once per day — the card set is stable.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Honest lastModified for price-bearing pages: the day of the latest price
  // snapshot — when their content really last changed. Evergreen pages carry no
  // date at all; stamping everything "today" teaches Google to distrust the
  // sitemap's dates (a route into "Crawled - currently not indexed").
  // The per-card history table is gone (it grew with catalogue x market x day
  // for a feature that only read the last two days), so there is no honest
  // "last price snapshot" date. Price-bearing pages now carry no lastModified
  // rather than a fabricated one.

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/cards`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/characters`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/stores`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/stores/suggest`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/widgets`, changeFrequency: "monthly", priority: 0.5 },
    // Sealed-product database — high-intent ("<set> booster box price") landers.
    { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85 },
    // Deals — biggest discounts vs the market guide; refreshes with every import.
    { url: `${SITE_URL}/deals`, changeFrequency: "daily", priority: 0.85 },
    // Card value checker — targets the "MTG card value/worth" query family.
    { url: `${SITE_URL}/card-value`, changeFrequency: "daily", priority: 0.85 },
    { url: `${SITE_URL}/market`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/games`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/games/duel`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/games/rip`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/games/catcher`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/games/breaker`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/trade`, changeFrequency: "monthly", priority: 0.5 },
    // Restock trackers — high-intent ("<set> in stock") landers; refresh often.
    { url: `${SITE_URL}/restock`, changeFrequency: "daily", priority: 0.85 },
    ...FEATURED_RESTOCKS.map((p) => ({
      url: `${SITE_URL}/restock/${p.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    })),
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Everything below depends on the database. A sitemap prerender failure
  // hard-fails the ENTIRE Vercel build, and per-query .catch guards already
  // proved insufficient once — so the whole dynamic section is fenced. Worst
  // case Google sees static routes until the next daily revalidate.
  try {
    const [cards, sealed] = await Promise.all([
      // Three-tier indexability, mirroring card/[id]'s generateMetadata so a
      // URL's sitemap presence and its own <meta robots> always agree:
      //   1. hasLivePrice                    -> indexed, priority 0.8
      //   2. TCGplayer market guide only     -> indexed, priority 0.55
      //   3. neither                         -> noindex, EXCLUDED here
      prisma.card.findMany({
        where: { OR: [{ hasLivePrice: true }, { marketPriceSource: "TCGplayer" }] },
        select: { id: true, slug: true, lowestPriceCents: true, marketPriceSource: true },
        orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
      }),
      // Sealed compare pages — slugs come from the AU catalogue baseline (the
      // same product exists across markets under one slug).
      getSealedGroups("AU"),
    ]);

  // Guides + blog — evergreen long-form content with REAL publish dates.
  const guideRoutes: MetadataRoute.Sitemap = [
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

  // Set landing pages (high-value head terms, e.g. "Dominaria prices").
  const setRoutes: MetadataRoute.Sitemap = SETS.filter((s) => !s.comingSoon).map((s) => ({
    url: `${SITE_URL}/sets/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const cardRoutes: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/card/${c.slug ?? c.id}`,
    changeFrequency: "daily",
    // Priced cards (the ones people search for) rank slightly higher; their
    priority: c.lowestPriceCents != null ? 0.8 : c.marketPriceSource === "TCGplayer" ? 0.55 : 0.5,
  }));

  // Sealed compare pages (dedupe by slug — same product can recur across markets).
  const seenSlugs = new Set<string>();
  const sealedRoutes: MetadataRoute.Sitemap = [];
  for (const g of sealed) {
    if (seenSlugs.has(g.slug)) continue;
    seenSlugs.add(g.slug);
    sealedRoutes.push({
      url: `${SITE_URL}/sealed/${g.slug}`,
      changeFrequency: "daily",
      priority: g.lowestPriceCents != null ? 0.75 : 0.55,
    });
  }

  // Character hubs — only those clearing the priced-printing threshold, so a
  // hub that is still thin stays out of the index (its own page carries the
  // matching noindex, and it re-enters automatically once priced).
  const characterRoutes: MetadataRoute.Sitemap = (await indexableCharacterSlugs().catch(() => [])).map((slug) => ({
    url: `${SITE_URL}/character/${slug}`,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // Individual store profile pages — bounded by the retailer list, never by
  // catalogue size.
  const storeRoutes: MetadataRoute.Sitemap = RETAILER_LIST.map((r) => ({
    url: `${SITE_URL}/stores/${r.key}`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));

  // Faceted hubs (type / rarity / printing / era), same indexability rule as
  // each hub's own generateMetadata.
  let facetRoutes: MetadataRoute.Sitemap = [];
  try {
    const groups = await Promise.all(FACET_KINDS.map((k) => listFacetValues(k)));
    const checked = await Promise.all(
      groups.flat().map(async (f) => ({ f, priced: await pricedCountForFacet(f.where) }))
    );
    facetRoutes = checked
      .filter((c) => c.priced >= MIN_PRICED_TO_INDEX_FACET)
      .map(({ f }) => ({ url: `${SITE_URL}/cards/${f.kind}/${f.slug}`, changeFrequency: "daily" as const, priority: 0.65 }));
  } catch {
    facetRoutes = [];
  }

  return [
    ...staticRoutes, ...guideRoutes, ...setRoutes, ...sealedRoutes, ...cardRoutes,
    ...characterRoutes, ...storeRoutes, ...facetRoutes,
  ];
  } catch (e) {
    console.error("sitemap: dynamic section failed, serving static routes:", e);
    return staticRoutes;
  }
}
