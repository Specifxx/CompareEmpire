/**
 * The old singles site's card pages (/card/<slug>, June to September 2026) are gone for good: DexCompare has been sealed only since
 * 2026-09-25 and no card has a sealed page to stand in for it. They answered 404 until 2026-11-18; now 410 Gone, the status that
 * says "removed on purpose, don't come back", so Google drops the ~6.7K old URLs it still re-reads at a few pages a day (836 of the
 * newest 1,000 "crawled, not indexed" in Search Console, 16 Nov) sooner and spends that crawl on the live pages
 * (DECISIONS.md, "Retired card pages answer 410 Gone"). A person who follows an old link gets a short page with a way on.
 *
 * No imports: the route runs on the edge and reads no data, so a hit costs a few milliseconds, once a day per URL (CDN header).
 */
export const RETIRED_CARD_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex",
  "Cache-Control": "public, max-age=3600",
  "Vercel-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
};

export const RETIRED_CARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>This card page is gone · DexCompare</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0f1115;color:#e8eaed;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}main{max-width:32rem;text-align:center}a{color:#f2b134}</style>
</head><body><main>
<p>410</p>
<h1>This card page is gone.</h1>
<p>DexCompare compares Pokémon <b>sealed</b> product only: booster boxes, Elite Trainer Boxes, bundles, tins and collections. Single-card pages from the old site were removed.</p>
<p><a href="/">Compare sealed Pokémon prices</a></p>
</main></body></html>`;

export function retiredCardResponse(method: "GET" | "HEAD" = "GET"): Response {
  return new Response(method === "HEAD" ? null : RETIRED_CARD_HTML, { status: 410, headers: { ...RETIRED_CARD_HEADERS } });
}
