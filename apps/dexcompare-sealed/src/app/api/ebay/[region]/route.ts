import { NextResponse } from "next/server";
import { parseRegion, type ListingsResponse } from "@/lib/ebay-context";
import { parseContext } from "@/lib/ebay-context-parse";
import { ebayClient } from "@/lib/ebay-listings";

// GET /api/ebay/<region>?c=<context>: the chase-card listings a strip shows (components/EbayListings.tsx).
//
// Not an open proxy. The region is one of the seven, the context one of a fixed list
// (lib/ebay-context-parse.ts parseContext); the queries are constants in lib/ebay-listings.ts. No
// request text is ever forwarded to eBay, and the response holds only whitelisted fields (id,
// title, imageUrl, price, url, condition, asOf): no seller, raw eBay JSON, token or error text.
//
// Pages never call this during their own render: they stay ISR, and a strip fetches from the
// browser once it scrolls near the viewport. Nothing here touches the database.
//
// Caching. A good, fresh answer: CDN 1 h, stale for up to 1 h more (eBay's licence allows listing
// data to be at most 6 h old, and the unit tells the visitor "up to 3 hours": lib/ebay-listings.ts
// rule 2), browsers 5 min. An empty, failed, stale or PARTIAL answer: 60 s at the CDN, so a blip is
// never cached for an hour.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A refresh waits at most REFRESH_DEADLINE_MS (7 s); the function limit must not cut it off.
export const maxDuration = 10;

const GOOD = "public, max-age=300, s-maxage=3600, stale-while-revalidate=3600";
const SHORT = "public, max-age=30, s-maxage=60";

function reply(body: ListingsResponse, status: number, cache: string) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
}

export async function GET(req: Request, { params }: { params: { region: string } }) {
  const now = new Date().toISOString();
  const region = parseRegion(params.region);
  const ctx = parseContext(new URL(req.url).searchParams.get("c") ?? "generic");
  if (!region || !ctx) return reply({ items: [], asOf: now, reason: "bad-request" }, 400, "public, s-maxage=3600");
  try {
    const out = await ebayClient().listings(region, ctx);
    const good = out.items.length > 0 && !out.reason;
    return reply(out, 200, good ? GOOD : SHORT);
  } catch {
    // listings() never throws; this is the belt to its braces. No detail leaves the server.
    return reply({ items: [], asOf: now, reason: "unavailable" }, 200, SHORT);
  }
}
