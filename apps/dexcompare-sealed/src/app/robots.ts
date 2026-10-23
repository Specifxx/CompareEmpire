import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Backlink, data and minor-engine crawlers that render page after page of the
// long tail for someone else's index and send no visitors (2026-10-16, as on
// RiftCompare). A bot that ignores robots.txt needs the Vercel Firewall instead. AhrefsBot and SemrushBot joined them on 2026-10-23
// (COST.md): SEO-tool crawlers, each page they render a billed function call and CDN transfer. Search engines (Googlebot, Bingbot…)
// and AI assistants' crawlers stay allowed under "*", as before.
const BLOCKED_BOTS = [
  "Bytespider", "meta-externalagent", "Meta-ExternalAgent",
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "BLEXBot", "Barkrowler", "serpstatbot", "SeekportBot", "ImagesiftBot", "Timpibot",
];

// QUERY-STRING URLS ARE NOT CRAWLED (2026-10-16). No page reads a query string
// and no sitemap URL carries one, so a ?utm_ / ?ref= variant is the same page
// fetched again. The Allows keep what a crawler needs that does carry a query:
// Next's assets (?dpl=; without them Google cannot render a page), the share
// images and the icon. The longest matching rule wins, so each beats "/*?".
const QUERY_ALLOWS = ["/_next/", "/og/", "/*opengraph-image", "/icon"];

// /sitemap.xml is the index Next writes for generateSitemaps (src/app/sitemap.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /go is the first-party click redirect (src/app/go/route.ts): never a page to crawl.
      { userAgent: "*", allow: ["/", ...QUERY_ALLOWS], disallow: ["/api/", "/go", "/*?"] },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
