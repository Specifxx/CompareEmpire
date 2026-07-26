import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// DexCompare is PAUSED (owner decision, 2026-07-26): development/automation is
// focused on RiftCompare instead. Every request — every route, every asset
// request that isn't a genuine Next.js internal — gets this single static
// notice instead of reaching a page. It's a self-contained HTML string (no
// external CSS/JS/font requests, no Prisma import), so this never touches the
// database: the site is now fully idle regardless of Neon's reachability.
//
// To resume DexCompare later: delete this file (and revert the sitemap.ts /
// layout.tsx "force-dynamic" changes from the same commit if static
// generation should come back).
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>DexCompare — paused</title>
<style>
  html, body { margin: 0; min-height: 100vh; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #0a0a0f; color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 24px; text-align: center;
  }
  .card { max-width: 480px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
  h1 { font-size: 22px; font-weight: 800; margin: 0; }
  p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0; }
  a { color: #f87171; text-decoration: underline; text-underline-offset: 2px; }
</style>
</head>
<body>
  <div class="card">
    <h1>We&rsquo;ve paused development of DexCompare</h1>
    <p>
      We&rsquo;re focusing our work on RiftCompare right now, so DexCompare is
      temporarily offline. If you&rsquo;ve been using DexCompare and would like
      us to bring it back, let us know at
      <a href="mailto:riftcompare@gmail.com">riftcompare@gmail.com</a>.
    </p>
  </div>
</body>
</html>`;

export function middleware(_request: NextRequest) {
  // 200, not 503: a 503 is the "correct" HTTP semantic for a temporary outage,
  // but this pause is open-ended, not a short maintenance window — Vercel's own
  // anomaly monitor treats a site-wide 503 as a live incident and pages on it
  // (a new recurring alert, exactly what this change is trying to eliminate).
  // The page already carries <meta name="robots" content="noindex" />, which is
  // what actually controls the SEO/indexing outcome here.
  return new NextResponse(PAGE, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Match every path except Next.js's own internal asset pipeline — the response
// above is fully self-contained (no _next/static or _next/image requests are
// ever made from it), so this is really just a safety exclusion, not a
// dependency.
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
