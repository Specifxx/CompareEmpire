import { getArticles } from "@/lib/articles";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// JSON Feed 1.1 (jsonfeed.org) — the machine-readable companion to /feed.xml,
// easier for agents and modern readers to parse than RSS. Same content: the
// blog + guides (lib/articles.ts), newest first. File-based, so it updates on
// deploy exactly when new articles ship.
export const revalidate = 3600;

export async function GET() {
  const articles = getArticles().sort((a, b) => (a.date < b.date ? 1 : -1));

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${SITE_NAME} — Pokémon TCG Blog & Guides`,
    home_page_url: `${SITE_URL}/blog`,
    feed_url: `${SITE_URL}/feed.json`,
    description:
      "News, guides, market analysis and price insights for the Pokémon TCG, from DexCompare — the Pokémon card price comparison.",
    language: "en-au",
    items: articles.map((a) => {
      const url = `${SITE_URL}/${a.category === "guide" ? "guides" : "blog"}/${a.slug}`;
      // Articles carry a date (not a time); publish as 9am AEST that day.
      return {
        id: url,
        url,
        title: a.title,
        summary: a.excerpt,
        content_text: a.excerpt,
        date_published: new Date(`${a.date}T09:00:00+10:00`).toISOString(),
        authors: [{ name: a.author }],
        tags: [a.category],
      };
    }),
  };

  return Response.json(feed, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
