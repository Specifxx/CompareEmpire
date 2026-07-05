import { SITE_URL } from "@/lib/site";

// llms.txt — the AI-agent site map (spec: llmstxt.org), ported from
// RiftCompare. A curated markdown index of the site's most useful pages so
// LLMs/agents (Perplexity, ChatGPT browsing, etc.) can navigate and cite the
// site without parsing HTML. Served at /llms.txt as plain text.
export const revalidate = 86400;

const abs = (p: string) => `${SITE_URL}${p}`;

const SECTIONS: { title: string; links: [string, string][] }[] = [
  {
    title: "Prices & database",
    links: [
      ["/browse", "Every Pokémon TCG card with live lowest prices compared across stores (AU/NZ/US/UK)."],
      ["/sets", "All Pokémon TCG sets — each set page lists every card with live prices."],
      ["/sealed", "Sealed products — booster boxes, ETBs, bundles — with the cheapest live price per product."],
      ["/deals", "Today's best deals: cards priced well below their market guide right now."],
      ["/market", "The DexCompare market index and daily market stats for Pokémon singles."],
      ["/trending", "Trending Pokémon cards — the biggest price movers, updated daily."],
      ["/most-valuable", "The most valuable Pokémon cards right now, by live market price."],
      ["/restock", "Restock trackers for hot sealed products — live stock alerts per retailer."],
      ["/stores", "The stores whose public prices DexCompare tracks and compares."],
    ],
  },
  {
    title: "Tools",
    links: [
      ["/tools", "Every free DexCompare tool & calculator in one place."],
      ["/card-value", "Free Pokémon card value checker — live market value plus real store prices."],
      ["/tools/net-proceeds", "Selling-fee calculator — what you actually pocket after fees, postage & grading."],
      ["/tools/grade-ev", "Should-I-grade calculator — the expected value of grading a raw card."],
      ["/tools/arbitrage", "Cross-market arbitrage: cards priced lower in one market than another."],
      ["/trade", "Trade calculator — value both sides of a card trade fairly."],
      ["/collection", "Collection tracker — track owned cards and their live value."],
      ["/wishlist", "Save cards and get price context."],
    ],
  },
  {
    title: "Guides & content",
    links: [
      ["/guides", "Buying guides: grading, fakes, reprints, price history and more."],
      ["/blog", "News, market analysis and the daily Pokémon market wrap."],
      ["/games", "Free Pokémon mini-games (Dexdle and more)."],
      ["/about", "What DexCompare is, where prices come from, how often they update."],
    ],
  },
];

export function GET() {
  const lines: string[] = [];
  lines.push("# DexCompare");
  lines.push("");
  lines.push(
    "> DexCompare (dexcompare.app) is a free, independent price comparison for the Pokémon Trading Card Game: " +
      "20k+ singles and hundreds of sealed products, each with live lowest prices compared across local stores in " +
      "Australia, New Zealand, the US and the UK (plus eBay AU/US/UK), updated daily."
  );
  lines.push("");
  for (const s of SECTIONS) {
    lines.push(`## ${s.title}`);
    lines.push("");
    for (const [href, desc] of s.links) lines.push(`- [${href.slice(1)}](${abs(href)}): ${desc}`);
    lines.push("");
  }
  lines.push("## Feeds & machine-readable");
  lines.push("");
  lines.push(`- [llms-full.txt](${abs("/llms-full.txt")}): a single-file markdown snapshot of the market + top cards, for LLMs.`);
  lines.push(`- [feed.xml](${abs("/feed.xml")}): RSS 2.0 feed of the blog and guides.`);
  lines.push(`- [feed.json](${abs("/feed.json")}): JSON Feed (1.1) of the blog and guides.`);
  lines.push(`- [sitemap.xml](${abs("/sitemap.xml")}): sitemap index (cards, sets, sealed, content).`);
  lines.push(`- [news-sitemap.xml](${abs("/news-sitemap.xml")}): Google News sitemap of recent blog posts.`);
  lines.push(`- [api/v1/index.json](${abs("/api/v1/index.json")}): the DexCompare Global Index (level, changes, daily series) as JSON.`);
  lines.push(`- [api/v1/card/{slug}/prices.json](${abs("/api/v1/card/base1-4-charizard/prices.json")}): per-market lowest price for any card as JSON.`);
  lines.push(`- [api/v1/openapi.json](${abs("/api/v1/openapi.json")}): OpenAPI 3.1 description of the free API.`);
  lines.push(`- [api/mcp](${abs("/api/mcp")}): Model Context Protocol server (JSON-RPC) exposing get_index + get_card_prices tools to agents.`);
  lines.push(`- Clean markdown mirrors (rel=alternate text/markdown): /llm/card/{slug}, /llm/blog/{slug}, and /llm/market.`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
