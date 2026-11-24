// The marketplace order test, outside the US (owner, 2026-11-24: "are we doing it optimally?" with Amazon, eBay and TCGplayer side by
// side; strategy/marketplace-placement-2026-11-24.html). Per click the three earn about the same (A$0.35 eBay, ~0.42 TCGplayer, ~0.32
// Amazon, 30 days to 23 Nov), but TCGplayer is a US shop: a buyer in Australia, the UK, Canada, the EU or New Zealand likely completes
// fewer orders there than on their own eBay or Amazon. The question: does putting the local marketplace first earn more?
//   "now"   today's order in the product page's Marketplaces block: eBay, TCGplayer, Amazon.
//   "local" eBay, the region's own Amazon, then TCGplayer (its row already says "US$, ships from the US"). Same rows, same words, same
//           links: only the order changes, by CSS (globals.css, "The marketplace order test"), so the server HTML is the same for both.
// Only non-US product pages, never the quick view (its own A/B, lib/ab.ts), never the US. 50/50 in the browser (localStorage
// `mkt-order`), from MKT_ORDER_START: the A/B freeze runs to 2 Dec and Dex's other tests are read on 3 Dec.
// Counted through ONE event, `mkt_order` {k}: "<arm>:seen" once a visit when a non-US Marketplaces block is drawn, then
// "<arm>:ebay" / "<arm>:tcg" / "<arm>:amz" on that visit's first click on each network (outside the quick view).
// Read 17 Dec: clicks per 100 seen visits per network, weighted by each network's A$ per click. Keep "local": make mktOrder() return
// "local"; drop it: delete this file, its CSS and its three calls.
import { track } from "@vercel/analytics";

export const MKT_ORDER_KEY = "mkt-order";
export const MKT_ORDER_START = Date.parse("2026-12-03T00:00:00Z");
const SEEN = "mkt-order-seen";

export type MktArm = "now" | "local";
export type MktNetwork = "ebay" | "tcg" | "amz";

/** This visitor's arm, tossing the coin on first sight. Null: before the start, no storage, or not in a browser. */
export function mktOrder(now: number = Date.now()): MktArm | null {
  try {
    if (typeof window === "undefined" || now < MKT_ORDER_START) return null;
    let arm = window.localStorage.getItem(MKT_ORDER_KEY);
    if (arm !== "now" && arm !== "local") {
      arm = Math.random() < 0.5 ? "now" : "local";
      window.localStorage.setItem(MKT_ORDER_KEY, arm);
      if (window.localStorage.getItem(MKT_ORDER_KEY) !== arm) return null;
    }
    return arm as MktArm;
  } catch {
    return null;
  }
}

/** A non-US Marketplaces block was drawn: set `<html data-mktorder>` and count the visit once. */
export function mktOrderSeen(): void {
  if (typeof document === "undefined") return;
  const arm = mktOrder();
  if (!arm) return;
  document.documentElement.setAttribute("data-mktorder", arm);
  once(SEEN, () => track("mkt_order", { k: `${arm}:seen` }));
}

/** Which network a paid click went to, from its retailer label; null for a store. */
export function mktNetwork(retailer: string): MktNetwork | null {
  if (/^ebay/i.test(retailer)) return "ebay";
  if (/tcgplayer/i.test(retailer)) return "tcg";
  if (/^amazon/i.test(retailer)) return "amz";
  return null;
}

/** A buy click: counts the visit's first click on each network, only in a visit that saw a non-US Marketplaces block. */
export function mktOrderClick(el: Element | null, retailer: string): void {
  const net = mktNetwork(retailer);
  if (!net || !el || el.closest('[role="dialog"]')) return;
  try {
    if (!sessionStorage.getItem(SEEN)) return;
    const arm = localStorage.getItem(MKT_ORDER_KEY);
    if (arm !== "now" && arm !== "local") return;
    once(`${SEEN}-${net}`, () => track("mkt_order", { k: `${arm}:${net}` }));
  } catch {
    return;
  }
}

function once(key: string, send: () => void): void {
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  send();
}
