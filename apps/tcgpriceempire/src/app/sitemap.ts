import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { GAME_LIST } from "@/lib/games";

// Regenerate at most once per day — the catalogue refreshes daily.
export const revalidate = 86400;

// The sitemap protocol caps one file at 50k URLs. The full five-game catalogue
// exceeds that (MTG alone is ~90k printings), so V1 ships the head of the
// market — the most valuable priced cards — which is also what's realistic to
// get indexed early. Chunked per-game sitemap files are the documented V2.
const MAX_CARD_URLS = 45000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resilient to an empty/unreachable DB (build-time prerender on first deploy).
  const cards = await prisma.card
    .findMany({
      where: { marketPriceCents: { not: null } },
      select: { slug: true, marketPriceCents: true },
      orderBy: { marketPriceCents: "desc" },
      take: MAX_CARD_URLS,
    })
    .catch(() => []);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85 },
    ...GAME_LIST.map((g) => ({
      url: `${SITE_URL}/${g.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const cardRoutes: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/card/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...cardRoutes];
}
