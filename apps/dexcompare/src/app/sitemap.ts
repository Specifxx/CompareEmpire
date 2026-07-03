import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { dbHistory } from "@/lib/db-history";
import { SITE_URL } from "@/lib/site";
import { SETS } from "@/lib/constants";
import { getArticles } from "@/lib/articles";
import { FEATURED_RESTOCKS } from "@/lib/restocks";
import { getSealedGroups } from "@/lib/sealed-import";

// Hourly revalidation so new card slugs surface in Google within ~1 hour of a
// price snapshot, down from the previous 24-hour window.
export const revalidate = 3600;

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
 */
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // Honest lastModified for price-bearing pages: the latest snapshot day.
  // When DB is unavailable (e.g. during the build check) priceDay stays
  // undefined and lastModified is simply omitted — that's fine.
  let priceDay: Date | undefined;
  try {
    priceDay = (
      await dbHistory.priceHistory.findFirst({ orderBy: { day: "desc" }, select: { day: true } })
    )?.day;
  } catch {
    /* DB unavailable — priceDay stays undefined */
  }

  // ── Sitemap 0: static routes + content + sets + market wraps ──────────────
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1, lastModified: priceDay },
      { url: `${SITE_URL}/browse`, changeFrequency: "daily", priority: 0.9, lastModified: priceDay },
      { url: `${SITE_URL}/sets`, changeFrequency: "weekly", priority: 0.85 },
      { url: `${SITE_URL}/sealed`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
      { url: `${SITE_URL}/deals`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
      { url: `${SITE_URL}/card-value`, changeFrequency: "daily", priority: 0.85, lastModified: priceDay },
      { url: `${SITE_URL}/most-valuable`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
      { url: `${SITE_URL}/trending`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
      { url: `${SITE_URL}/market`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
      { url: `${SITE_URL}/tools`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/tools/arbitrage`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
      { url: `${SITE_URL}/tools/net-proceeds`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/tools/grade-ev`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/games`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/dexdle`, changeFrequency: "daily", priority: 0.8 },
      { url: `${SITE_URL}/games/duel`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${SITE_URL}/games/rip`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${SITE_URL}/games/catcher`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${SITE_URL}/games/breaker`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${SITE_URL}/restock`, changeFrequency: "daily", priority: 0.85 },
      ...FEATURED_RESTOCKS.map((p) => ({
        url: `${SITE_URL}/restock/${p.slug}`,
        changeFrequency: "hourly" as const,
        priority: 0.85,
      })),
      { url: `${SITE_URL}/guides`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/stores`, changeFrequency: "monthly", priority: 0.5 },
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
      lastModified: priceDay,
    }));

    // Market Wrap: only the canonical hub. The dated editions are
    // template-generated (numeric deltas + one machine sentence) — thin,
    // near-duplicate pages that are a helpful-content risk at ~30 URLs, so they
    // carry noindex (see blog/market-wrap/[day]/page.tsx) and stay out of the
    // sitemap. The hub always shows the latest wrap and stays indexable.
    const wrapRoutes: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/blog/market-wrap`, changeFrequency: "daily", priority: 0.8, lastModified: priceDay },
    ];

    return [...staticRoutes, ...contentRoutes, ...setRoutes, ...wrapRoutes];
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
    // Only cards priced in AT LEAST ONE market: cards with no price anywhere
    // render a thin "No prices found yet" shell and carry noindex (see
    // card/[id]/page.tsx generateMetadata) — submitting noindexed URLs sends
    // Google a mixed signal. A card re-enters the sitemap automatically the
    // day the importer prices it.
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { lowestPriceCents: { not: null } },
          { lowestPriceCentsNz: { not: null } },
          { lowestPriceCentsUs: { not: null } },
          { lowestPriceCentsGb: { not: null } },
        ],
      },
      select: { id: true, slug: true, lowestPriceCents: true, imageUrl: true },
      orderBy: { lowestPriceCents: { sort: "desc", nulls: "last" } },
    });
    // Zero priced cards is never a valid production state (it means the DB was
    // reseeded before the price importer ran) — refuse to publish it.
    if (cards.length === 0) {
      throw new Error("sitemap: card bucket resolved to 0 priced cards — refusing to publish an empty sitemap");
    }
    return cards.map((c) => ({
      url: `${SITE_URL}/card/${c.slug ?? c.id}`,
      changeFrequency: "daily" as const,
      priority: c.lowestPriceCents != null ? 0.8 : 0.6,
      lastModified: priceDay,
      // Image sitemap: surface each card's unique art to image search (absolute URLs only).
      ...(c.imageUrl && c.imageUrl.startsWith("http") ? { images: [c.imageUrl] } : {}),
    }));
  }

  // ── Sitemap 2: sealed product pages (~500 URLs) ────────────────────────────
  if (id === 2) {
    // Same fail-loud policy as bucket 1 — no silent empty-200s.
    const sealed = await getSealedGroups("AU");
    const seenSlugs = new Set<string>();
    const routes: MetadataRoute.Sitemap = [];
    for (const g of sealed) {
      if (seenSlugs.has(g.slug)) continue;
      seenSlugs.add(g.slug);
      routes.push({
        url: `${SITE_URL}/sealed/${g.slug}`,
        changeFrequency: "daily" as const,
        priority: g.lowestPriceCents != null ? 0.75 : 0.55,
        lastModified: g.lowestPriceCents != null ? priceDay : undefined,
      });
    }
    if (routes.length === 0) {
      throw new Error("sitemap: sealed bucket resolved to 0 products — refusing to publish an empty sitemap");
    }
    return routes;
  }

  return [];
}
