// Click analytics (Vercel Web Analytics custom events) and the first-party /go redirect. Pure: no React, no network, so the tests
// check the event shapes, the redirect's allow-list and the URLs it builds. docs/analytics.md says where to read each event.
//
// VERCEL'S LIMITS DECIDE THE SHAPE. Custom events need a Pro (or Enterprise) plan; Hobby records none. Pro keeps TWO properties per
// event (and drops the rest); the Web Analytics Plus add-on raises that to EIGHT. So:
//   • default (Pro): every buy click sends TWO events, two properties each, so every dimension survives:
//       buy_click   { retailer, placement }   "Pokebox (AU)", "product-table": clicks by store and by surface (unchanged since 2026-10)
//       buy_product { product, region }       "surging-sparks-booster-box", "au": clicks by product and by region
//   • NEXT_PUBLIC_ANALYTICS_PROPS=8 (Web Analytics Plus): ONE buy_click with all eight:
//       { product, store, region, price, position, page, affiliate, placement }
// Values are ids, slugs, codes and numbers only: no visitor data, nothing typed, no URL (a URL could carry a query string).
import type { Placement } from "./affiliate";
import { isRegion, type Region } from "./regions";

/** The property count Vercel keeps per event on this project's plan (2 on Pro, 8 with Web Analytics Plus). */
export const ANALYTICS_PROPS = process.env.NEXT_PUBLIC_ANALYTICS_PROPS === "8" ? 8 : 2;

/** Vercel's limit on a property value (and on keys and event names). */
const MAX = 255;
const clip = (s: string) => s.slice(0, MAX);

export type Props = Record<string, string | number | boolean | null>;
export type AnalyticsEvent = [name: string, props: Props];

/** What a buy link knows about itself beyond its retailer and placement (all optional: an eBay search has no product row). */
export interface BuyItem {
  /** The product's slug (the product id a URL carries). */
  product?: string;
  /** The store's key ("pokebox"), "tcgplayer", or "ebay". */
  store?: string;
  /** The price shown on the button, in cents of the region's currency. */
  priceCents?: number;
  /** 1-based rank in the list the link sits in (the price table's row, say). */
  position?: number;
}

/** The kind of page a path is: what the reports group clicks by. "/au/p/x" → "product", "/" → "landing". */
export function pageTypeOf(pathname: string): string {
  const [first, second] = pathname.split("?")[0].split("/").filter(Boolean);
  if (!first) return "landing";
  if (!isRegion(first)) return first === "guides" ? "guide" : first;
  const map: Record<string, string> = {
    p: "product",
    sets: "set",
    type: "type",
    sealed: "browse",
    deals: "deals",
    "black-friday": "black-friday",
    preorders: "preorders",
    stores: "store",
    guides: "guide",
    tools: "tool",
    "cheapest-packs": "per-pack",
    "this-week": "this-week",
    releases: "releases",
  };
  return second ? map[second] ?? second : "home";
}

/** The region a path is under, or null ("/about"). */
export function regionOfPath(pathname: string): Region | null {
  const first = pathname.split("/").filter(Boolean)[0] ?? null;
  return isRegion(first) ? first : null;
}

/** The events one buy click sends (see the header), for the plan's property count. */
export function buyEvents(o: { retailer: string; placement: Placement | string; rel: string; pathname: string; item?: BuyItem }, props = ANALYTICS_PROPS): AnalyticsEvent[] {
  const region = regionOfPath(o.pathname);
  const it = o.item ?? {};
  if (props >= 8) {
    const all: Props = {
      product: it.product ? clip(it.product) : null,
      store: clip(it.store ?? o.retailer),
      region,
      price: it.priceCents != null ? Math.round(it.priceCents) / 100 : null,
      position: it.position ?? null,
      page: pageTypeOf(o.pathname),
      affiliate: /\bsponsored\b/.test(o.rel),
      placement: clip(o.placement),
    };
    return [["buy_click", all]];
  }
  const out: AnalyticsEvent[] = [["buy_click", { retailer: clip(o.retailer), placement: clip(o.placement) }]];
  if (it.product) out.push(["buy_product", { product: clip(it.product), region }]);
  return out;
}

// ─── The first-party redirect: /go ───────────────────────────────────────────
// A store or TCGplayer offer's button links to /go?… on our own domain, which records the click on the server (ad blockers can't hide
// it) and answers 302 to the store's (or TCGplayer's affiliate) URL. It never redirects anywhere but the host of the store the link
// names: no open redirect. robots.txt disallows /go, every response is noindex and uncached, and the <a> keeps its rel.

export interface GoParams {
  dest: string;
  store: string;
  region: Region;
  placement: Placement;
  product?: string;
  priceCents?: number;
  position?: number;
}

/** The /go URL for an offer's link. */
export function goHref(p: GoParams): string {
  const q = new URLSearchParams({ u: p.dest, s: p.store, r: p.region, pl: p.placement });
  if (p.product) q.set("p", p.product);
  if (p.priceCents != null) q.set("c", String(Math.round(p.priceCents)));
  if (p.position != null) q.set("n", String(p.position));
  return `/go?${q.toString()}`;
}

/** The page a placement sits on (the server has no pathname: a placement names its page). */
export function pageTypeOfPlacement(placement: string): string {
  if (placement.startsWith("product")) return "product";
  if (placement.startsWith("preorders")) return "preorders";
  if (placement.startsWith("browse")) return "browse";
  if (placement === "store-page") return "store";
  return placement;
}


// ─── Other events ─────────────────────────────────────────────────────────────

/** region_switch { from, to }: the header's region menu. */
export const regionSwitchEvent = (from: Region | null, to: Region): AnalyticsEvent => ["region_switch", { from: from ?? "none", to }];

/** search { region, kind }: a search submitted ("submit") or a typeahead product picked ("select"). Never the query: it is typed text. */
export const searchEvent = (region: Region | null, kind: "submit" | "select" | "all"): AnalyticsEvent => ["search", { region: region ?? "none", kind }];

/** home_region { region, source }: the landing page showed a region's products (geo, language, saved choice or time zone). */
export const homeRegionEvent = (region: Region, source: string): AnalyticsEvent => ["home_region", { region, source: clip(source) }];

/**
 * amazon_click { product, region, page }: a click on an Amazon AU link (lib/amazon.ts). `product` is the product's slug, or for a link
 * with no product (a set, a type, a guide's closing search) what it searches for, as a slug ("set:phantasmal-flames"). On Vercel's
 * Pro plan (two properties kept) it is { product, region }: the page is in the same click's buy_click placement. GA4 always gets all
 * three (components/AmazonLink.tsx).
 */
export function amazonClickEvent(o: { product: string; pathname: string }, props = ANALYTICS_PROPS): AnalyticsEvent {
  const all: Props = { product: clip(o.product), region: regionOfPath(o.pathname), page: pageTypeOf(o.pathname) };
  return ["amazon_click", props >= 8 ? all : { product: all.product, region: all.region }];
}

/** The same click as GA4 parameters: all three, always. */
export function amazonGa4Params(o: { product: string; pathname: string }): Record<string, string> {
  return { product: clip(o.product), region: regionOfPath(o.pathname) ?? "none", page: pageTypeOf(o.pathname) };
}
