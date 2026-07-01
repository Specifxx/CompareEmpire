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
    // at /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml — it does NOT create a
    // combining index at the bare /sitemap.xml (that was a wrong assumption in
    // an earlier comment; the URL was a live 404). List the real files directly,
    // which is valid per the sitemap protocol (multiple Sitemap: lines allowed).
    sitemap: [
      `${SITE_URL}/sitemap/0.xml`,
      `${SITE_URL}/sitemap/1.xml`,
      `${SITE_URL}/sitemap/2.xml`,
    ],
    host: SITE_URL,
  };
}
