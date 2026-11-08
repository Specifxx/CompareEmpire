// IndexNow (Bing, Yandex, Seznam, Naver): tell the engines which pages exist so
// they recrawl now instead of on their own schedule. Google does not take it.
//
// The key is public by design: every engine fetches it from /indexnow.txt
// (src/app/indexnow.txt/route.ts) to check that a submission for this host is
// ours, and a key is verified per host, so sharing one across sites is allowed.
// DexCompare's is the one the old manual workflow used; INDEXNOW_KEY in Vercel
// overrides it. The daily job (scripts/indexnow-submit.ts) reads whatever the
// live key file serves, so the two can never disagree.
//
// Pure: no database, no network of its own. tests/indexnow.test.ts.
export const DEFAULT_INDEXNOW_KEY = "b30a9c7a9c944dff83bc180fd7d68430";

/** IndexNow's key format: 8 to 128 of a-z, A-Z, 0-9 and "-". */
export function isIndexNowKey(v: string | null | undefined): v is string {
  return !!v && /^[a-zA-Z0-9-]{8,128}$/.test(v);
}

export function indexNowKey(env: Record<string, string | undefined> = process.env): string {
  const k = env.INDEXNOW_KEY?.trim();
  return isIndexNowKey(k) ? k : DEFAULT_INDEXNOW_KEY;
}

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map((m) => m[1]!.replace(/&amp;/g, "&"));

/** Every page URL of a sitemap: a <sitemapindex> is followed one child at a time; a plain <urlset> is its own single child. */
export async function sitemapUrls(sitemapUrl: string, fetchText: (url: string) => Promise<string>, pause = 250): Promise<string[]> {
  const xml = await fetchText(sitemapUrl);
  if (!/<sitemapindex/.test(xml)) return locs(xml);
  const out: string[] = [];
  for (const child of locs(xml)) {
    out.push(...locs(await fetchText(child)));
    if (pause) await new Promise((r) => setTimeout(r, pause));
  }
  return [...new Set(out)];
}

export interface SubmissionPlan {
  origin: string;
  host: string;
  keyLocation: string;
  urls: string[];
  dropped: number;
}

/**
 * Where a submission goes: the origin of the sitemap's OWN URLs (the canonical
 * dexcompare.app), only the URLs on it, and the key file there. IndexNow
 * answers 422 to any URL off the request's host: the old manual workflow named
 * one host while every sitemap URL was on the other, and MTG Compare's
 * daily run failed the same way for a week (a stale SITE_URL). Null without URLs.
 */
export function submissionPlan(urls: readonly string[]): SubmissionPlan | null {
  const first = urls.find((u) => /^https?:\/\//.test(u));
  if (!first) return null;
  const { origin, host } = new URL(first);
  const same = urls.filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return { origin, host, keyLocation: `${origin}/indexnow.txt`, urls: same, dropped: urls.length - same.length };
}

/**
 * Small batches (2026-11-08, Bing Webmaster: "IndexNow is in batch mode"): IndexNow takes 10,000 URLs a request, but Bing
 * wants a few URLs as they change, not the whole sitemap every day.
 */
export const INDEXNOW_BATCH = 100;
/** The most URLs one run sends: new URLs first, then the longest-unsent, never one sent in the last REFRESH_DAYS. */
export const INDEXNOW_RUN_MAX = 300;
export const INDEXNOW_REFRESH_DAYS = 7;

/** When each URL was last sent (ISO date), kept between runs in the Actions cache (scripts/indexnow-submit.ts). */
export type SentState = Record<string, string>;

/**
 * What a run sends: URLs never sent (in sitemap order, hubs first), then those sent longest ago and at least REFRESH_DAYS ago,
 * up to INDEXNOW_RUN_MAX. Every price page changes daily, so a sitemap lastmod says nothing; this sends each URL about weekly.
 */
export function pickUrls(urls: readonly string[], sent: SentState, today: string, max = INDEXNOW_RUN_MAX, refreshDays = INDEXNOW_REFRESH_DAYS): string[] {
  const fresh = urls.filter((u) => !sent[u]);
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - refreshDays * 86_400_000).toISOString().slice(0, 10);
  const stale = urls.filter((u) => sent[u] && sent[u]! <= cutoff).sort((a, b) => sent[a]!.localeCompare(sent[b]!));
  return [...fresh, ...stale].slice(0, max);
}

/** The state after a run: today for what was sent, and only URLs still in the sitemap. */
export function nextState(urls: readonly string[], sent: SentState, done: readonly string[], today: string): SentState {
  const keep = new Set(urls);
  const out: SentState = {};
  for (const [u, d] of Object.entries(sent)) if (keep.has(u)) out[u] = d;
  for (const u of done) out[u] = today;
  return out;
}
