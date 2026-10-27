import { NextResponse } from "next/server";
import { runPriceAlerts } from "@/lib/price-alerts";
import { runRestockAlerts } from "@/lib/restock-alerts";

// Daily wishlist price-drop check + featured-product restock check. Triggered by
// Vercel Cron (see vercel.json) or any scheduler hitting this URL with the
// Authorization: Bearer <CRON_SECRET> header. Scheduled just after the price
// importer so it sees fresh prices + fresh sealed stock.
export const dynamic = "force-dynamic";
export const maxDuration = 120; // seconds

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [priceDrops, restocks] = await Promise.all([runPriceAlerts(), runRestockAlerts()]);
    return NextResponse.json({ ok: true, priceDrops, restocks });
  } catch (e) {
    const message = e instanceof Error ? e.message : "alert run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
