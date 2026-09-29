import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml is the index Next writes for generateSitemaps (src/app/sitemap.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
