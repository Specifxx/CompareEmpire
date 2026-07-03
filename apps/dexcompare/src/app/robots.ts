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
    // Advertise ONLY the sitemap index (app/sitemap.xml/route.ts serves a real
    // <sitemapindex> pointing at the three children /sitemap/0.xml, /1.xml,
    // /2.xml that sitemap.ts generates). Crawlers discover the children THROUGH
    // the index — that's the standard hierarchy, and it means the children are
    // not separately "discovered from robots.txt" entries in Search Console
    // (which can't be manually removed and lingered as scary "Couldn't fetch"
    // rows). The IndexNow workflow already recurses into the index to collect
    // child URLs, so it keeps working with just this one line.
    sitemap: [`${SITE_URL}/sitemap.xml`],
    host: SITE_URL,
  };
}
