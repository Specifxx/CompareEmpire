import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep account/utility + transactional routes out of the index.
      disallow: [
        "/api/", "/admin", "/login", "/register", "/profile", "/wishlist",
        "/sell", "/wanted", "/unsubscribe",
        // Marketplace transactional pages (cart/checkout/order) — never content.
        "/marketplace/cart", "/marketplace/checkout", "/marketplace/order",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
