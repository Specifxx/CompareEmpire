// Is this /go request a bot rather than a person? (2026-11-13: a crawler that ignores robots.txt and sends a browser's
// User-Agent opened about 28,000 /go links in four days, 10 to 13 November; every one was recorded as a go_click and the
// TCGplayer ones reached Impact as our clicks, with no sales.) A bot is still sent on, but nothing is recorded and a
// TCGplayer link loses its affiliate wrapper, so the network never counts it as our click. The same rule as the card
// sites' lib/bot-click.ts: every browser a person uses sends a User-Agent and an Accept-Language, a known crawler names
// itself, and every current browser (Chrome 76+, Firefox 90+, Safari 16.4+) marks a navigation with Sec-Fetch-Mode.
// The rules may only mark obvious bots: a person is never refused a link, at worst sent untagged. Pure and edge-safe.
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|scrape|headless|phantom|puppeteer|playwright|selenium|python|curl|wget|httpx|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|aiohttp|scrapy|feedfetcher|facebookexternalhit|preview|bytespider|gptbot|claudebot|ccbot|perplexity|amazonbot|petalbot|semrush|ahrefs|mj12|dotbot|yandex|baidu/i;

export function looksLikeBot(headers: Headers): boolean {
  const ua = headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return true;
  if (!headers.get("accept-language")) return true;
  if (!headers.get("sec-fetch-mode")) return true;
  return false;
}

/** Where a bot is sent: TCGplayer's own page instead of our Impact link to it; any other destination as it is. */
export function untaggedDest(dest: string): string {
  try {
    const u = new URL(dest);
    if (u.hostname.toLowerCase() !== "partner.tcgplayer.com") return dest;
    const inner = new URL(u.searchParams.get("u") ?? "");
    return inner.protocol === "https:" && /(?:^|\.)tcgplayer\.com$/.test(inner.hostname.toLowerCase()) ? inner.toString() : dest;
  } catch {
    return dest;
  }
}
