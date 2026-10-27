import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Click beacon — DISABLED. This used to record one row per outbound
// affiliate-link click (dbHistory.clickEvent.create) so click counts could be
// verified independently of each partner's dashboard; that write (and the
// unbounded, never-read ClickEvent table it fed) was pure Neon-egress/storage
// liability, so it's been switched off as part of the "zero history" cleanup.
// Kept as a real route (not deleted) purely so any stale cached page — which
// still calls sendBeacon("/api/click") until its client bundle is reloaded —
// gets a clean 204 instead of a 404.
export async function POST() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
