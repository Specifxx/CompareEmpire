import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep account/utility + transactional routes out of the index.
        disallow: [
          "/api/", "/admin", "/login", "/register", "/profile", "/wishlist",
          "/unsubscribe", "/sell",
        ],
      },
    ],
    // sitemap.ts uses generateSitemaps() (3 child buckets), which Next.js serves
    // at /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml. app/sitemap.xml/route.ts
    // additionally serves a real <sitemapindex> at the conventional /sitemap.xml.
    // List the index first, then the children directly (multiple Sitemap: lines
    // are valid per the protocol; crawlers dedupe) — the children stay listed so
    // the robots-driven IndexNow workflow keeps fetching flat <urlset> files.
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap/0.xml`,
      `${SITE_URL}/sitemap/1.xml`,
      `${SITE_URL}/sitemap/2.xml`,
    ],
    host: SITE_URL,
  };
}
