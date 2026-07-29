import { SITE_URL } from "@/lib/site";

// A real sitemap INDEX at the conventional /sitemap.xml URL.
//
// sitemap.ts uses generateSitemaps() (child buckets), which Next.js serves at
// /sitemap/0.xml, /sitemap/1.xml, etc — but it never creates a combining index
// at the bare /sitemap.xml, so that URL was a live 404 (Search Console
// "Couldn't fetch", and an earlier IndexNow failure). This route fills the gap
// with a standard <sitemapindex> pointing at the children, so the one
// conventional URL works everywhere. robots.ts continues to list the children
// directly, which is also valid — crawlers dedupe. Keep in sync with
// generateSitemaps() in sitemap.ts.
export const revalidate = 86400;

// 0 static+content+sets, 1 card singles, 2 sealed products, 3 Pokémon species hubs.
const CHILD_IDS = [0, 1, 2, 3];

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${CHILD_IDS.map((id) => `  <sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
