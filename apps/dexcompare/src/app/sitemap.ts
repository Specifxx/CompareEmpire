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
  const [cards, sealed] = await Promise.all([
    prisma.card.findMany({
      select: { id: true, slug: true, lowestPriceCents: true },
      orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
    }),
    // Sealed compare pages — slugs come from the AU catalogue baseline (the same
    // product exists across markets under one slug).
    getSealedGroups("AU").catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    // Sealed-product database — high-intent ("<set> booster box price") landers.
    { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85 },
    // Deals — biggest discounts vs the market guide; refreshes with every import.
    { url: `${SITE_URL}/deals`, changeFrequency: "daily", priority: 0.85 },
    // Card value checker — targets the "pokemon card value/worth" query family.
    { url: `${SITE_URL}/card-value`, changeFrequency: "daily", priority: 0.85 },
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
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/trade`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Guides + blog — evergreen long-form content, strong organic landers.
  const guideRoutes: MetadataRoute.Sitemap = [
    ...getArticles("guide").map((a) => ({
      url: `${SITE_URL}/guides/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...getArticles("blog").map((a) => ({
      url: `${SITE_URL}/blog/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ];

  // Set landing pages (high-value head terms, e.g. "Pokémon Origins prices").
  const setRoutes: MetadataRoute.Sitemap = SETS.filter((s) => !s.comingSoon).map((s) => ({
    url: `${SITE_URL}/sets/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const cardRoutes: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/card/${c.slug ?? c.id}`,
    changeFrequency: "daily",
    // Priced cards (the ones people search for) rank slightly higher.
    priority: c.lowestPriceCents != null ? 0.8 : 0.5,
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

  return [...staticRoutes, ...guideRoutes, ...setRoutes, ...sealedRoutes, ...cardRoutes];
}
