// What a listings unit may ask the API route for, and what comes back. Pure (no
// secrets, no fetch, no Node APIs): the browser imports this to build its request
// and to RE-VALIDATE the response, and the server imports it to parse the request.
// The server half (token, search, caches) is ebay-listings.ts, which the client
// never imports.
//
// The route is not an open proxy. A request names a REGION (one of the seven) and a
// CONTEXT from a fixed list; each context is mapped, on the server, to hard-coded queries.
// No user text ever reaches eBay. The whitelist itself (it needs sets.ts and sealed-title.ts,
// 30 KB the browser must not download) is parseContext in ebay-context-parse.ts, server only;
// here the browser has only the cheap shape check isContextString.
import { listingHref } from "./affiliate";
import type { Placement } from "./affiliate";
import { isRegion, type Region } from "./regions";

/** The shape of a context string ("home", "set:<slug>"…). Shape only: the server decides what is in the whitelist. */
export function isContextString(c: unknown): c is string {
  return typeof c === "string" && /^(?:home|generic|sealed|store|releases|(?:set|type|product):[a-z0-9-]{1,40})$/.test(c);
}

/**
 * The request string the browser sends for a context. Every context that the server answers
 * from the generic query set is sent as "home", so they share one CDN entry and one request.
 */
export function requestContext(c: string): string {
  return /^(?:home|generic|sealed|store|releases|type:.+|product:none)$/.test(c) ? "home" : c;
}

/** The heading a unit shows: "Chase cards on eBay", or "Chase cards from <set> on eBay" where the context is a set. */
export function contextHeading(ctx: { setName: string | null }): string {
  return ctx.setName ? `Chase cards from ${ctx.setName} on eBay` : "Chase cards on eBay";
}

// ─── The response ──────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  /** eBay's title, as returned (control characters stripped, at most 80 characters: eBay's own limit). */
  title: string;
  /** https, on *.ebayimg.com */
  imageUrl: string;
  /** Exactly as eBay returned it: never converted. */
  price: { value: string; currency: string };
  /** https, an eBay host, carrying our campaign id. */
  url: string;
  /** eBay's condition text ("Brand New", "Used"…), short. */
  condition?: string;
}

export interface ListingsResponse {
  items: Listing[];
  /** When the server fetched these from eBay (ISO). */
  asOf: string;
  /** Why `items` is empty, if it is: a short code, never an eBay message. */
  reason?: string;
}

/**
 * Listing data older than this is never shown. eBay's API License Agreement 8.1(c) allows item data
 * at most 6 hours behind eBay; the unit's disclosure says "up to 3 hours older than on eBay", so
 * that is the bound the browser enforces (the server's own stale limit is the same).
 */
export const MAX_DISPLAY_AGE_MS = 3 * 3600_000;

const ONE_SPACE = /\s+/g;
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // eslint-disable-next-line no-control-regex
  // Control characters, zero-width and bidi-override/isolate characters (seller-controlled text must not reorder what is around it).
  return v.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, " ").replace(ONE_SPACE, " ").trim().slice(0, max);
}

/** The price as eBay returned it, or null if it is not a plain positive decimal. */
export function cleanPrice(p: unknown): { value: string; currency: string } | null {
  if (!p || typeof p !== "object") return null;
  const { value, currency } = p as { value?: unknown; currency?: unknown };
  if (typeof value !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(value) || !(Number(value) > 0)) return null;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return null;
  return { value, currency };
}

/** Image URL accepted only on eBay's image hosts (*.ebayimg.com), https, no credentials. */
export function cleanImageUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 512) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password || !/\.ebayimg\.com$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Check an item out of the (JSON) response before rendering it: the browser does not
 * trust the route any more than the route trusts eBay. Returns the whitelisted fields
 * only, or null. `region`/`placement` set the link's customid (affiliate.ts listingHref).
 */
export function acceptListing(raw: unknown, region: Region, placement: Placement): (Listing & { href: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.length <= 64 ? r.id : "";
  const title = cleanText(r.title, 80);
  const imageUrl = cleanImageUrl(r.imageUrl);
  const price = cleanPrice(r.price);
  const href = typeof r.url === "string" ? listingHref(r.url, region, placement) : null;
  if (!id || !title || !imageUrl || !price || !href) return null;
  const condition = cleanText(r.condition, 24);
  return { id, title, imageUrl, price, url: r.url as string, href, ...(condition ? { condition } : {}) };
}

/** The route's response, checked: items that fail validation are dropped, a bad envelope is "no listings". */
export function acceptResponse(raw: unknown, region: Region, placement: Placement): { items: (Listing & { href: string })[]; asOf: string } {
  const none = { items: [] as (Listing & { href: string })[], asOf: "" };
  if (!raw || typeof raw !== "object") return none;
  const { items, asOf } = raw as { items?: unknown; asOf?: unknown };
  const t = typeof asOf === "string" ? Date.parse(asOf) : NaN;
  if (!Array.isArray(items) || !Number.isFinite(t)) return none;
  const age = Date.now() - t;
  if (age > MAX_DISPLAY_AGE_MS || age < -3600_000) return none; // too old to show, or a clock that cannot be right
  const seen = new Set<string>();
  const out: (Listing & { href: string })[] = [];
  for (const it of items.slice(0, 24)) {
    const ok = acceptListing(it, region, placement);
    if (ok && !seen.has(ok.id)) {
      seen.add(ok.id);
      out.push(ok);
    }
  }
  return { items: out, asOf: out.length ? (asOf as string) : "" };
}

/** The request URL for a region and context. */
export function listingsUrl(region: Region, context: string): string {
  return `/api/ebay/${region}?c=${encodeURIComponent(context)}`;
}

/** Region from the route's path segment, or null. */
export function parseRegion(raw: unknown): Region | null {
  return typeof raw === "string" && isRegion(raw) ? raw : null;
}
