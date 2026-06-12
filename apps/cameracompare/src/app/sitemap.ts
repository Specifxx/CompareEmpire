import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { getArticles } from "@/lib/articles";
import { SETS } from "@/lib/constants";

// Regenerate at most once per day — the catalogue is stable.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Whole-function fence: a sitemap prerender failure hard-fails the entire
  // Vercel build, so the DB query degrades to static routes on any error.
  let cards: { id: string; slug: string | null; lowestPriceCents: number | null }[] = [];
  try {
    cards = await prisma.card.findMany({
      select: { id: true, slug: true, lowestPriceCents: true },
      orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
    });
  } catch (e) {
    console.error("sitemap: card query failed, serving static routes:", e);
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = getArticles().map((a) => ({
    url: `${SITE_URL}/${a.category === "guide" ? "guides" : "blog"}/${a.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Brand landing pages (e.g. "Sony camera prices").
  const brandRoutes: MetadataRoute.Sitemap = SETS.map((s) => ({
    url: `${SITE_URL}/sets/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const cardRoutes: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/card/${c.slug ?? c.id}`,
    changeFrequency: "daily",
    priority: c.lowestPriceCents != null ? 0.8 : 0.5,
  }));

  return [...staticRoutes, ...brandRoutes, ...articleRoutes, ...cardRoutes];
}
