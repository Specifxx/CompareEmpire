"use client";
// Amazon's price from the Creators API, with the time it was fetched and Amazon's disclaimer, as its licence requires. The
// page sits in the CDN for a day, so the browser checks the age again: past 24 hours the price gives way to the row's plain
// "Amazon's own price" line (the button still opens the listing) rather than a stale number.
import { useEffect, useState } from "react";

const MAX_AGE_MS = 24 * 3600_000;
export const AMAZON_PRICE_DISCLAIMER =
  "Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on Amazon at the time of purchase will apply to the purchase of this product.";

export interface AmazonLiveCell {
  price: string;
  at: string;
  timeZone: string;
  zoneLabel: string;
  /** Amazon's own saving and deal badge on the listing (Black Friday, 2026-11-27): Amazon's claim, gone with the price */
  off?: number;
  deal?: string;
  until?: string;
}

export function AmazonPrice({ live, fallback }: { live: AmazonLiveCell; fallback: string }) {
  const [fresh, setFresh] = useState(true);
  const [dealOn, setDealOn] = useState(true);
  useEffect(() => setFresh(Date.now() - Date.parse(live.at) < MAX_AGE_MS), [live.at]);
  // A deal that ended since the build no longer speaks for the price.
  useEffect(() => setDealOn(!live.until || Date.now() < Date.parse(live.until)), [live.until]);
  if (!fresh) return <span className="block truncate text-sm leading-6 text-muted sm:text-xs">{fallback}</span>;
  const when = new Date(live.at).toLocaleString("en-GB", { timeZone: live.timeZone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <span title={AMAZON_PRICE_DISCLAIMER}>
      {dealOn && (live.deal || live.off) && (
        <span className="block truncate text-[11px] font-semibold leading-4 text-open">
          {live.deal ? `${live.deal}${live.off ? ` · ${live.off}% off` : ""}` : `${live.off}% off at Amazon`}
        </span>
      )}
      <span className="tabular font-display text-lg font-bold leading-6">{live.price}</span>
      <span className="block truncate text-[11px] leading-4 text-muted sm:text-xs">as of {when} {live.zoneLabel}*</span>
    </span>
  );
}
