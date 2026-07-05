import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Citation / answer-engine crawlers we WANT: they read a page and cite/link back
// (referral traffic + AI-answer visibility). GPTBot/ClaudeBot also train on the
// content, which helps DexCompare become a "known" entity in the models.
const CITATION_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "PerplexityBot", "Perplexity-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "Google-Extended", "Applebot-Extended", "cohere-ai", "Amazonbot",
];
// Bulk scrapers that DON'T cite back (Common Crawl feeds models second-hand;
// ByteDance/Meta agents send no referral traffic) — no upside, so blocked.
const BLOCKED_BOTS = ["CCBot", "Bytespider", "meta-externalagent", "Meta-ExternalAgent"];

// Account/utility + transactional routes kept out of the index.
const PRIVATE = ["/admin", "/login", "/register", "/profile", "/wishlist", "/unsubscribe", "/sell"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Allow the public data API (/api/v1/*) for everyone — it carries an
        // X-Robots-Tag: noindex header, so it's fetchable by agents/dashboards but
        // never indexed as a page. The rest of /api/ (auth/machine routes) stays blocked.
        allow: ["/", "/api/v1/"],
        disallow: ["/api/", ...PRIVATE],
      },
      {
        // AI citation/search crawlers: public content + the agent-readable surfaces
        // (data API, llms.txt, llms-full.txt). Allow is more specific than /api/, so it wins.
        userAgent: CITATION_BOTS,
        allow: ["/", "/api/v1/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", ...PRIVATE],
      },
      {
        // Non-citing bulk scrapers: no crawl.
        userAgent: BLOCKED_BOTS,
        disallow: "/",
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
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
