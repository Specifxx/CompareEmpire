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

// ── Real-time single-URL submission ────────────────────────────────────────
// For DISCRETE content events — a tracked product flipping back in stock, a
// page going live — where "this one URL changed, recrawl it now" is the true
// signal and there's nothing to batch with.
//
// Deliberately NOT used for the daily price refresh: that changes thousands of
// card pages at once, and IndexNow is explicitly designed to take those as one
// batched request (protocol cap 10k URLs/call). Firing thousands of individual
// POSTs instead would be slower, would look like abuse of the endpoint, and
// would ask Bing to re-crawl the whole catalogue URL-by-URL — the opposite of
// the crawl-budget discipline the rest of this file exists to protect. Batch
// stays batch; only genuinely one-off changes stream.
//
// Dedupe: the same URL is never resubmitted inside DEDUPE_TTL_MS. Restock
// re-checks run every ~15 minutes and a product can flap in and out of stock,
// so without this a single flapping SKU could ping on every cycle. The cache
// is per-process (serverless instances don't share it), which is the right
// trade-off here: worst case a URL is submitted once per warm instance rather
// than once globally — still bounded, and no external store to maintain.
const DEDUPE_TTL_MS = 60 * 60 * 1000; // 1h
const recentlySubmitted = new Map<string, number>();

export async function pingUrlNow(path: string, opts: { force?: boolean } = {}): Promise<boolean> {
  const now = Date.now();
  // Opportunistically drop expired entries so the map can't grow unbounded in
  // a long-lived instance.
  for (const [key, at] of recentlySubmitted) {
    if (now - at > DEDUPE_TTL_MS) recentlySubmitted.delete(key);
  }
  const last = recentlySubmitted.get(path);
  if (last != null && now - last < DEDUPE_TTL_MS) return false; // debounced
  const submitted = await pingIndexNow([path], opts);
  if (submitted > 0) recentlySubmitted.set(path, now);
  return submitted > 0;
}

// After the daily price refresh: every priced page has genuinely new content
// (prices ARE the content), so resubmit the hubs, the set pages and all card
// pages. Card list comes from the DB; failures degrade to just the hubs.
export async function pingAfterPriceRefresh(opts: { force?: boolean } = {}): Promise<number> {
  const hubs = ["/", "/browse", "/deals", "/card-value", "/most-valuable", "/trending", "/sealed", "/stores"];
  const sets = SETS.filter((s) => !s.comingSoon).map((s) => `/sets/${s.slug}`);
  // Only pages worth submitting, and only as many as IndexNow will actually accept.
  // This previously read ALL ~20k cards with no `where` and no `take` (~1.2 MB) to
  // build a >20,000-URL payload — but IndexNow caps a submission at 10,000 URLs, so
  // the request was rejected and that transfer bought nothing. Cards with no live
  // price are noindex anyway (see the tiering in sitemap.ts), so submitting them
  // would be asking Bing to crawl pages we tell it not to index.
  const INDEXNOW_CARD_CAP = Number(process.env.INDEXNOW_CARD_CAP) || 5000;
  const cards = await prisma.card
    .findMany({
      where: { hasLivePrice: true },
      select: { id: true, slug: true },
      orderBy: { searchCount: "desc" },
      take: INDEXNOW_CARD_CAP,
    })
    .then((rows) => rows.map((c) => `/card/${c.slug ?? c.id}`))
    .catch(() => [] as string[]);
  return pingIndexNow([...hubs, ...sets, ...cards], opts);
}
