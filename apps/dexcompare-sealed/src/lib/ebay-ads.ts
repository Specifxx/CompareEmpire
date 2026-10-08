// Where the eBay units go and how far apart they stay. Pure: no database, no React, so the
// browser (BrowseGrid, the pre-footer strip) and the tests use it as it stands.
//
// The rules every unit follows live here and in the components, in one place:
//   • eBay is a LISTING STRIP (components/EbayStrip.tsx: real listings imported once a day, shown as image
//     tiles with price, shipping and their age) or, when there is nothing to list, ONE compact CTA row. No
//     text-only banner, chip row or "Still deciding?" row exists any more.
//   • A unit never enters a ranked table, a count, a median, JSON-LD, a meta tag or the sitemap.
//   • Density: at most ONE unit in a phone viewport (390x844) and two on a desktop one (the header's own "eBay" item
//     is always one of the two on xl and up). The planners below keep units far enough apart; where a page is too
//     short to fit its own units beside the pre-footer strip, the pre-footer strip gives way (<NoPreFooter/>).
import type { Region } from "./regions";

// ─── The browse grid's in-feed tile ────────────────────────────────────────────

export const FEED_EVERY = 12; // after the 12th real product
/** A tile needs this many real products after it, so it never ends a list or sits near the pre-footer strip. */
export const FEED_MIN_TAIL = 8;

/**
 * Where the in-feed listing tile goes in a grid of `total` real products: after the 12th, and only where at least
 * FEED_MIN_TAIL products follow. Returns the 1-based count of real products BEFORE it, or null. Pure and deterministic,
 * so server and client render the same markup.
 */
export function feedSlot(total: number): number | null {
  return total - FEED_EVERY >= FEED_MIN_TAIL ? FEED_EVERY : null;
}

export type GridEntry<T> = { kind: "item"; item: T; index: number } | { kind: "feed" };

/** The grid's items with the one tile after the feedSlot position. */
export function withFeed<T>(items: readonly T[], enabled = true): GridEntry<T>[] {
  const slot = enabled ? feedSlot(items.length) : null;
  const out: GridEntry<T>[] = [];
  items.forEach((item, index) => {
    out.push({ kind: "item", item, index });
    if (slot != null && index + 1 === slot) out.push({ kind: "feed" });
  });
  return out;
}

// ─── The pre-footer strip ──────────────────────────────────────────────────────

/**
 * Which feed the slim strip above the footer shows: the one the page's own strip is NOT, so a page never shows the same
 * listings twice. A region's home page has none (null): it already carries two strips (chase cards under the stats, sealed after
 * the first rail), and a feed holds only 8 listings (the six of its strip and two to spare), too few for a third unit of four
 * different tiles; the home page renders <NoPreFooter/> so the layout's wrapper goes with it.
 */
export function preFooterPlan(pathname: string, region: Region): { context: "chase" | "sealed" } | null {
  const p = pathname.replace(/\/+$/, "");
  const base = `/${region}`;
  if (p === base) return null;
  const rest = p.startsWith(`${base}/`) ? p.slice(base.length + 1).split("/")[0] : "";
  // Pages whose own strip is the chase one (set pages cascade to it, stores and releases use it): the slim strip is sealed.
  if (rest === "sets" || rest === "stores" || rest === "releases") return { context: "sealed" };
  return { context: "chase" };
}

// ─── Page budgets ──────────────────────────────────────────────────────────────
// Where a page's own units leave too little room for the strip above the footer, the page asks for it to be
// dropped (components/Ebay.tsx NoPreFooter). Heights are phone-width estimates in px, checked by the screenshot sweep.

const PHONE_ROW = 330; // a product-card row on a phone: two cards and the gap
const DESK_ROW = 446; // …and on a desktop: four cards across
// Two units must be at least a viewport (844 phone, 900 desktop) apart, plus the
// slack that row heights vary by (a name that wraps, a per-pack line).
const GAP = 960;
/** A full strip's height on a phone and a desktop (px), measured: the product page's strip is a unit of this size. */
export const STRIP_PHONE = 470;
export const STRIP_DESK = 420;

/**
 * Product page: which of the lower units fit. The marketplace panel (or, sold out, the callout) is always there;
 * the product's listing strip goes directly below the offer table when the table is long enough to sit a screen below
 * the panel (else at the bottom of the page, in place of the pre-footer strip), and the pre-footer strip needs that
 * much page (offer table, other regions, related products) under the last unit above it. Estimated for a phone
 * (offer row ~105px) and a desktop (~73px); both must fit: the sweep in README.md checks these numbers against real pages.
 */
export function productAdPlan(o: { offerRows: number; elsewhere: number; related: number }): { tableGroup: boolean; preFooter: boolean } {
  const phoneTo = 300 + 105 * o.offerRows;
  const deskTo = 160 + 73 * o.offerRows; // measured at 1280: the panel to the end of N rows is 160 + ~72 per row
  const tableGroup = phoneTo >= GAP && deskTo >= GAP;
  const phoneAfter = 80 + (o.elsewhere ? 130 + 44 * Math.ceil(o.elsewhere / 2) : 0) + (o.related ? 150 + PHONE_ROW * Math.ceil(o.related / 2) : 0);
  const deskAfter = 110 + (o.elsewhere ? 40 : 0) + (o.related ? 160 + DESK_ROW * Math.ceil(o.related / 4) : 0);
  // Above the pre-footer strip: the strip below the table when there is one, else the panel.
  const preFooter = tableGroup ? phoneAfter >= GAP && deskAfter >= GAP : phoneTo + phoneAfter >= GAP && deskTo + deskAfter >= GAP;
  return { tableGroup, preFooter };
}

/** Set / type page: the strip sits after the first row of products (ProductGrid `strip`), so the pre-footer strip needs a grid long enough between them. */
export function gridPageHasRoomForFooter(products: number): boolean {
  return products >= 8;
}

/** (No longer used by the store pages, whose own strip is now at the bottom of the list and replaces the pre-footer one; kept with its tests.) Rows are ~76px on a phone. */
export function listHasRoomForFooter(rows: number): boolean {
  return rows >= 14;
}
