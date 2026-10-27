import { track } from "@vercel/analytics/server";
import { goEvent, parseGo } from "@/lib/go";

// The first-party click redirect (lib/click-events.ts goHref, lib/go.ts): a store or TCGplayer offer's button is /go?u=…&s=…, which
// records the click server-side (a go_click Web Analytics event, and one structured log line) and answers 302 to the store's own URL
// or TCGplayer's affiliate URL. Only to the host of the store named (lib/go.ts goAllowed): never an open redirect. Anything else is
// a 400 with a link home. Edge: no data file is read, so a click costs a few milliseconds, and the event is sent after the response
// (waitUntil), so the redirect never waits on analytics.
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Vercel's request context (what @vercel/functions' waitUntil and @vercel/analytics/server read): work kept alive after the response.
// Off Vercel (dev, tests) there is none, and the promise simply runs on.
type VercelContext = { waitUntil?: (p: Promise<unknown>) => void };
function waitUntil(p: Promise<unknown>): void {
  const ctx = (globalThis as Record<symbol, { get?: () => VercelContext | undefined } | undefined>)[Symbol.for("@vercel/request-context")]?.get?.();
  ctx?.waitUntil?.(p);
}

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer-when-downgrade" };

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const p = parseGo(url.searchParams);
  if (!p) {
    return new Response("This link isn't valid. Go to https://dexcompare.app/ to find the product again.", {
      status: 400,
      headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const [name, props] = goEvent(p);
  // Bots and link previewers follow links too: count only what a browser asked for.
  const ua = req.headers.get("user-agent") ?? "";
  if (!/bot|crawl|spider|preview|slurp|facebookexternalhit|curl|wget/i.test(ua)) {
    console.log(JSON.stringify({ event: name, ...props }));
    waitUntil(track(name, props, { request: req }).catch(() => {}));
  }
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: p.dest } });
}
