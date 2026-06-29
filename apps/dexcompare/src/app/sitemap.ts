import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { SETS } from "@/lib/constants";
import { getArticles } from "@/lib/articles";
import { FEATURED_RESTOCKS } from "@/lib/restocks";
import { getSealedGroups } from "@/lib/sealed-import";

// Regenerate at most once per day — the card set is stable.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Honest lastModified for price-bearing pages: the day of the latest price
  // snapshot — when their content really last changed. Evergreen pages carry no
  // date at all; stamping everything "today" teaches Google to distrust the
  // sitemap's dates (a route into "Crawled - currently not indexed").
  let priceDay: Date | undefined;
  try {
    priceDay = (
      await prisma.priceHistory.findFirst({ orderBy: { day: "desc" }, select: { day: true } })
    )?.day;
  } catch {
    /* fenced below anyway */
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1, lastModified: priceDay },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9, lastModified: priceDay },
    // Sealed-product database — high-intent ("<set> booster box price") landers.
    { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
    // Deals — biggest discounts vs the market guide; refreshes with every import.
    { url: `${SITE_URL}/deals`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
    // Card value checker — targets the "pokemon card value/worth" query family.
    { url: `${SITE_URL}/card-value`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
    // Most valuable cards — "most/expensive valuable pokemon cards" query family.
    { url: `${SITE_URL}/most-valuable`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    // Trending hub — most-viewed cards.
    { url: `${SITE_URL}/trending`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    // The market index — stock-style view of the whole singles market.
    { url: `${SITE_URL}/market`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    // Arbitrage & eBay deals — flip opportunities + cards cheapest on eBay.
    { url: `${SITE_URL}/tools/arbitrage`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    // Minigames — retention surfaces (daily Dexdle especially).
    { url: `${SITE_URL}/games`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/dexdle`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/games/duel`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/games/rip`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/games/catcher`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/games/breaker`, changeFrequency: "weekly", priority: 0.6 },
    // Restock trackers — high-intent ("<set> in stock") landers; refresh often.
    { url: `${SITE_URL}/restock`, changeFrequency: "daily", priority: 0.85 },
    ...FEATURED_RESTOCKS.map((p) => ({
      url: `${SITE_URL}/restock/${p.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    })),
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/stores`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/trade`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Everything below depends on the database. A sitemap prerender failure
  // hard-fails the ENTIRE Vercel build, and per-query .catch guards already
  // proved insufficient once — so the whole dynamic section is fenced. Worst
  // case Google sees static routes until the next daily revalidate.
  try {
    const [cards, sealed] = await Promise.all([
      prisma.card.findMany({
        select: { id: true, slug: true, lowestPriceCents: true },
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

  // Set landing pages (high-value head terms, e.g. "Pokémon Origins prices").
  const setRoutes: MetadataRoute.Sitemap = SETS.filter((s) => !s.comingSoon).map((s) => ({
    url: `${SITE_URL}/sets/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.85,
    lastModified: priceDay,
  }));

  const cardRoutes: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/card/${c.slug ?? c.id}`,
    changeFrequency: "daily",
    // Priced cards (the ones people search for) rank slightly higher; their
    // prices refresh with every snapshot, so that day is their real lastmod.
    priority: c.lowestPriceCents != null ? 0.8 : 0.5,
    lastModified: c.lowestPriceCents != null ? priceDay : undefined,
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
      lastModified: g.lowestPriceCents != null ? priceDay : undefined,
    });
  }

  // Daily Market Wrap editions — one per snapshot day with a predecessor
  // (the first snapshot day is the baseline, not a wrap). Fresh daily content.
  const wrapDayRows = await prisma.priceHistory.findMany({
    distinct: ["day"],
    select: { day: true },
    orderBy: { day: "desc" },
    take: 31,
  });
  const wrapRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/blog/market-wrap`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    ...wrapDayRows.slice(0, -1).map((r) => ({
      url: `${SITE_URL}/blog/market-wrap/${r.day.toISOString().slice(0, 10)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      // An edition is written once, on its own day.
      lastModified: r.day,
    })),
  ];

  return [...staticRoutes, ...guideRoutes, ...wrapRoutes, ...setRoutes, ...sealedRoutes, ...cardRoutes];
  } catch (e) {
    console.error("sitemap: dynamic section failed, serving static routes:", e);
    return staticRoutes;
  }
}
