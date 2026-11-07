import { NextResponse } from "next/server";
import { createHash } from "crypto";

// eBay Marketplace Account Deletion endpoint for DexCompare's own eBay keyset.
//
// The keyset is registered on eBay's developer page with the endpoint
//   https://dexcompare.app/api/ebay/marketplace-deletion
// (archived/dexcompare/EBAY_GROWTH_CHECK.md). The sealed port of 2026-10 left this route behind, so
// /api/ebay/[region] answered the address with a 400 and eBay's notifications failed; eBay disables a
// keyset whose endpoint keeps failing (DECISIONS.md, 2026-11-07). A static segment wins over [region].
//
// GET  ?challenge_code=…  → { challengeResponse: sha256(code + EBAY_VERIFICATION_TOKEN + endpoint) }
// POST (a deletion notice) → 200. DexCompare stores no eBay user data (the Browse API returns
//      listings, not accounts), so acknowledging is all eBay requires.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ENDPOINT = "https://dexcompare.app/api/ebay/marketplace-deletion";

export function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("challenge_code");
  const token = process.env.EBAY_VERIFICATION_TOKEN ?? "";
  const endpoint = process.env.EBAY_DELETION_ENDPOINT || DEFAULT_ENDPOINT;
  if (!code) return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "EBAY_VERIFICATION_TOKEN is not set" }, { status: 500 });
  const challengeResponse = createHash("sha256").update(code).update(token).update(endpoint).digest("hex");
  return NextResponse.json({ challengeResponse }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  await req.text().catch(() => "");
  return new NextResponse(null, { status: 200 });
}
