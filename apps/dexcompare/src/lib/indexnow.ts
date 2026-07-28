// IndexNow — instant indexing pings for search engines that support the protocol
// (Bing, Yandex, Seznam, Naver; DuckDuckGo consumes Bing's index). One POST tells
// them "these URLs changed, recrawl them now" instead of waiting for the crawler
// to rediscover pages on its own schedule. Google does NOT participate — for Google
// the levers remain the sitemap + Search Console.
//
// Protocol: https://www.indexnow.org/documentation — the key below is verified by
// the engines fetching ${SITE_URL}/indexnow.txt (see app/indexnow.txt/route.ts),
// which must return it. PUBLIC by design: it only authorises "please recrawl
// dexcompare.app URLs", never anything destructive.
import { prisma } from "./db";
import { SITE_URL } from "./site";
import { SETS } from "./constants";

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "b30a9c7a9c944dff83bc180fd7d68430";

// Ping only from real production: previews/dev would submit URLs the engines then
// crawl against the canonical host at the wrong moment.
const isProduction = () => process.env.VERCEL_ENV === "production";

// Submit a batch of site paths (or absolute URLs) to IndexNow. Best-effort and
// bounded: never throws, 8s timeout, protocol cap of 10k URLs per call. Returns
// the number of URLs submitted (0 = skipped or failed).
export async function pingIndexNow(paths: string[], opts: { force?: boolean } = {}): Promise<number> {
  if ((!isProduction() && !opts.force) || !paths.length) return 0;
  const urlList = [...new Set(paths)]
    .slice(0, 10_000)
    .map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`));
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/indexnow.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(8000),
    });
    // 200 = submitted, 202 = accepted (key validation pending) — both are wins.
    return res.ok || res.status === 202 ? urlList.length : 0;
  } catch {
    return 0;
  }
}

// After the daily price refresh: every priced page has genuinely new content
// (prices ARE the content), so resubmit the hubs, the set pages and all card
// pages. Card list comes from the DB; failures degrade to just the hubs.
export async function pingAfterPriceRefresh(opts: { force?: boolean } = {}): Promise<number> {
  const hubs = ["/", "/browse", "/deals", "/card-value", "/most-valuable", "/trending", "/sealed", "/stores"];
  const sets = SETS.filter((s) => !s.comingSoon).map((s) => `/sets/${s.slug}`);
  const cards = await prisma.card
    .findMany({ select: { id: true, slug: true }, orderBy: { searchCount: "desc" } })
    .then((rows) => rows.map((c) => `/card/${c.slug ?? c.id}`))
    .catch(() => [] as string[]);
  return pingIndexNow([...hubs, ...sets, ...cards], opts);
}
