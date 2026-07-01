import { getArticles } from "@/lib/articles";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// RSS 2.0 feed of the blog + guides (ported from RiftCompare). A free
// distribution channel: feed readers and aggregators pick it up, and free
// auto-posting services (dlvr.it, IFTTT, Zapier free tier) can watch it to
// auto-share new articles to socials.
//
// Articles are file-based (lib/articles.ts) — no DB — so the feed updates on
// deploy, exactly when new articles ship.
export const revalidate = 3600;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function GET() {
  const articles = getArticles().sort((a, b) => (a.date < b.date ? 1 : -1));
  const items = articles
    .map((a) => {
      const url = `${SITE_URL}/${a.category === "guide" ? "guides" : "blog"}/${a.slug}`;
      // Articles carry a date (not a time); publish as 9am AEST that day.
      const pubDate = new Date(`${a.date}T09:00:00+10:00`).toUTCString();
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${esc(a.category)}</category>
      <description>${esc(a.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${SITE_NAME} — Pokémon TCG Blog & Guides`)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>News, guides, market analysis and price insights for the Pokémon TCG, from DexCompare — the Pokémon card price comparison.</description>
    <language>en-au</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
