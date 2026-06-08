import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { SETS } from "@/lib/constants";

// Regenerate at most once per day — the card set is stable.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cards = await prisma.card.findMany({
    select: { id: true, slug: true, lowestPriceCents: true },
    orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
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

  return [...staticRoutes, ...setRoutes, ...cardRoutes];
}
