import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// SEO-tool and data crawlers that send no visitors: each page they render is a billed function call and CDN transfer
// (COST.md, 2026-10-23). Search engines and AI assistants' crawlers stay allowed under "*".
const SEO_SCRAPERS = ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "DataForSeoBot", "BLEXBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      { userAgent: SEO_SCRAPERS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
