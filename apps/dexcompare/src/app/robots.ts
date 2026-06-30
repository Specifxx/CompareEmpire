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
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
