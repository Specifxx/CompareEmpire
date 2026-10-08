// GET /api/ebay/<region>?c=<context>, minus Next: validate, read, answer. The route file
// (src/app/api/ebay/[region]/route.ts) only wires this to the real database; tests/ call it with a fake reader.
//
// No eBay call, no token, no secret: a READ of the rows the daily import stored (ebay-read.ts). Region and
// context are whitelisted (ebay-context-parse.ts), the response holds only whitelisted fields, and nothing
// older than the age bound (EBAY_LISTING_MAX_AGE_HOURS, default 26) is ever returned. Caching: CDN 5 minutes
// for a good answer, 60 s for an empty or failed one (a blip is never cached for long). EBAY_LISTINGS=off is
// the kill switch.
import { NextResponse } from "next/server";
import { hoursToMs, parseMaxAgeHours, parseRegion, type ListingsResponse } from "./ebay-context";
import { parseContext } from "./ebay-context-parse";
import { listingsFor, type ReadDeps } from "./ebay-read";

export const GOOD = "public, max-age=60, s-maxage=300";
export const SHORT = "public, max-age=30, s-maxage=60";

function reply(body: ListingsResponse, status: number, cache: string) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
}

export async function handleListings(req: Request, regionParam: string, deps: ReadDeps): Promise<Response> {
  const region = parseRegion(regionParam);
  const ctx = parseContext(new URL(req.url).searchParams.get("c") ?? "chase");
  if (!region || !ctx) {
    return reply({ feed: null, items: [], fetchedAt: null, maxAgeMs: hoursToMs(parseMaxAgeHours(deps.env.EBAY_LISTING_MAX_AGE_HOURS)), reason: "bad-request" }, 400, SHORT);
  }
  const out = await listingsFor(ctx, region, deps); // never throws
  return reply(out, 200, out.items.length > 0 ? GOOD : SHORT);
}
