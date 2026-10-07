// REAL eBay LISTINGS for the chase-card strips: the Browse API, server-side only.
//
// SERVER ONLY. This module reads EBAY_CLIENT_ID / EBAY_CLIENT_SECRET (never
// NEXT_PUBLIC_*), and no component, hook or client module may import it (the "server-only"
// package is not installed and nothing new may be added, so the guard is by location:
// only src/app/api/ebay/[region]/route.ts, server components that call
// ebayListingsEnabled(), scripts/ebay-check.ts and tests/ import it; tests/ebay-listings.test.ts
// fails if a "use client" file does). The browser-safe half is ebay-context.ts.
//
// ─── What eBay's documentation and licence say (read 2026-10-05) and how each rule is met ───
//
// Sources
//   [spec]  Browse API OpenAPI v1.20.4, https://developer.ebay.com/develop/api/spec/browse_api.json
//   [lic]   eBay API License Agreement, https://www.edp.ebay.com/join/api-license-agreement
//   [req]   Buy APIs Requirements, https://www.developer.ebay.com/api-docs/buy/buy-requirements.html
//   [filt]  Buy API field filters, https://developer.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html
//   [guide] Buying Integration Guide, https://developer.ebay.com/api-docs/buy/static/api-browse.html
//   [limits] API call limits, https://developer.ebay.com/develop/get-started/api-call-limits
//
// Request (all verified in [spec]/[guide]; the two endpoints answered from this sandbox
// without credentials: the token endpoint 401 {"error":"invalid_client"}, the search with a bad
// token 401 {"errors":[{"errorId":1001,"domain":"OAuth",...}]}, with none 403)
//   • Token: POST https://api.ebay.com/identity/v1/oauth2/token, Basic auth (id:secret),
//     Content-Type application/x-www-form-urlencoded, body grant_type=client_credentials&
//     scope=https://api.ebay.com/oauth/api_scope ("View public data from eBay" [spec]).
//     Reply {access_token, expires_in (7200), token_type}. Cached in module memory,
//     single-flight, refreshed 5 minutes early and once on a 401.
//   • Search: GET https://api.ebay.com/buy/browse/v1/item_summary/search  q (<=100 chars:
//     longer is truncated), limit (1..200), filter, header X-EBAY-C-MARKETPLACE-ID
//     (EBAY_US default; EBAY_AU, EBAY_GB, EBAY_CA, EBAY_DE), header X-EBAY-C-ENDUSERCTX:
//     "affiliateCampaignId=<10-digit EPN campaign>,affiliateReferenceId=<=256 chars>".
//   • Filter: buyingOptions:{FIXED_PRICE}, price:[<min>] with priceCurrency:<ISO>
//     (a price filter must be accompanied by priceCurrency), deliveryCountry:<ISO-2>.
//   • Response (SearchPagedCollection): itemSummaries[] of ItemSummary { itemId, title (<=80),
//     image{imageUrl}, thumbnailImages[], price{value:string, currency}, itemWebUrl,
//     itemAffiliateWebUrl, condition, buyingOptions[], itemEndDate, seller{...} ... }, total, warnings.
//     itemAffiliateWebUrl is "returned only if the marketplace is part of the eBay Partner
//     Network (currently Singapore, EBAY_SG, is not supported) and the seller enables
//     affiliate tracking by including the X-EBAY-C-ENDUSERCTX request header". SG visitors
//     therefore use EBAY_US, as affiliate.ts already does.
//
// Rules and how they are applied (strictest reasonable reading)
//   1. [spec] "In order to receive a commission for your sales, you must use the URL returned
//      in the itemAffiliateWebUrl field". → Every link is that URL (validated: https, an eBay
//      host, OUR campid). If it is missing, the link is built from itemWebUrl with the same EPN
//      parameter set as affiliate.ts ebaySearchUrl (epnTagUrl). The browser only changes
//      customid (to dex-<region>-<placement>, listingHref), so reports say which surface earned.
//   2. [lic 8.1(c)] Item listing information shown "may not be more than six (6) hours older"
//      than on eBay (other eBay content 24 h), and an older copy must disclose how old it is.
//      → Server memory TTL 45 min; the CDN holds a response 1 h and may serve it stale for 1 h
//      more (NOT the 6 h a stale-while-revalidate of 21600 would allow: 45 min + 1 h + 6 h
//      would break the rule), so a displayed listing is at most ~2 h 50 min old. The server serves
//      its own stale copy after an eBay failure only up to 3 h, the browser refuses a response
//      whose asOf is older than 3 h, and a tab left open re-fetches once the data is 2 h old and
//      drops it at 3 h (a timer, not only on tab return). The unit DISCLOSES the age: "up to 3
//      hours older than on eBay".
//   3. [lic 3.1(b)] "intermediate copies … must be deleted when no longer required". → Only
//      the whitelisted fields of at most 12 items per key live in process memory (never a
//      database, file, or the Next data cache: fetches use cache:"no-store"); the raw JSON is
//      dropped after normalising.
//   4. [lic 8.1(b)(2)] eBay content "may not be co-mingled or combined with non-eBay Content" in
//      a public display. → A listings unit holds eBay listings only. Store prices, our ranking
//      and the chase-card artwork never share a unit with them; the no-keys search tiles are a
//      different unit that says "Search", not "listing", and shows no price.
//   5. [lic 8.1(d)] No derived statistics (average price etc.). → None: prices are shown one by
//      one, exactly as returned, never converted (a converted price is dropped), never
//      compared with a store's, never in a ranking, count, median, JSON-LD, meta tag or sitemap.
//   6. [lic 9(g)/(j)] No resale, no AI training. → Display only. No scraping anywhere.
//   7. [req] "Only surface FIXED PRICE items" (filter buyingOptions) → filter buyingOptions:
//      {FIXED_PRICE}; an item whose buyingOptions lacks it is dropped.
//   8. [req] "The image of the item must be an eBay image" (image.imageUrl) → host must end
//      .ebayimg.com, https; plain <img>, never proxied or resized by us.
//   9. [req] "You can sell only items delivered within the same country as the marketplace" →
//      filter deliveryCountry:<marketplace country>; [spec] that also gives VAT-inclusive prices
//      on EBAY_GB / EBAY_DE.
//  10. [req] "You must indicate when the item is not new" → the item's condition text is shown.
//      "Shipping costs must always be called out separately" → the unit says every price is
//      before shipping and to check eBay.
//  11. [req] Logo / User Agreement / seller fields are View-Item-page and checkout rules; a tile
//      is a link out to eBay's own View Item page and shows no seller data (none is passed to the
//      browser). The owner decided on text-only "eBay" (no logo); see DEPLOY.md.
//  12. [limits] Default 5,000 Browse calls/day per application; more after the Application
//      Growth Check. → A per-instance budget (DAILY_CALL_BUDGET), split so that per-set feeds
//      (up to 70 sets x 5 marketplaces: a crawler could request them all) can never use more than
//      SET_CALL_BUDGET of it and the generic (home) feed always has the rest; then serve
//      stale/empty. A token failure spends no budget and pauses every key (auth backoff). See
//      DEPLOY.md for the volume estimate.
//  13. Not used, on purpose: eBay's category_ids / aspect_filter (Language:{English}) would drop
//      sealed products and foreign cards upstream, but the category id (183454) and the aspect name
//      are not verifiable here without a keyset and differ per marketplace tree; a wrong one would
//      empty every feed. The title filter below does that work; try the upstream filter with
//      scripts/ebay-check.ts once keys exist.
//
// What the route returns, per item: id, title, imageUrl, price{value,currency}, url,
// condition (+ asOf for the response). Never seller names, raw eBay JSON, tokens or errors.
import { affiliateSubId, EBAY_CAMPAIGN_ID, epnTagUrl, isEbayHost } from "./affiliate";
import { cleanImageUrl, cleanPrice, cleanText, type Listing, type ListingsResponse } from "./ebay-context";
import type { ParsedContext } from "./ebay-context-parse";
import type { Region } from "./regions";
import { SET_BY_CODE } from "./sets";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** The only host this module ever talks to. There is deliberately no override. */
export const API_BASE = "https://api.ebay.com";
export const TOKEN_URL = `${API_BASE}/identity/v1/oauth2/token`;
export const SEARCH_URL = `${API_BASE}/buy/browse/v1/item_summary/search`;
export const OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";

export const MAX_RETURNED = 12;
export const MAX_FETCHED = 24;
export const REQUEST_TIMEOUT_MS = 6000;
/** Server-memory freshness of a good entry. Below the hour the page promises. */
export const TTL_MS = 45 * 60_000;
/** An entry that came back empty is retried sooner. */
export const EMPTY_TTL_MS = 15 * 60_000;
/** …and one built from only some of its queries. */
export const PARTIAL_TTL_MS = 5 * 60_000;
/** After a failed refresh a key is left alone this long (serving its stale copy meanwhile), doubling per consecutive failure up to the maximum. */
export const FAILURE_BACKOFF_MS = 60_000;
export const FAILURE_BACKOFF_MAX_MS = 15 * 60_000;
/** A 429 pauses every key for Retry-After, bounded by these. */
export const RATE_LIMIT_MIN_MS = 5 * 60_000;
export const RATE_LIMIT_MAX_MS = 15 * 60_000;
/** The server never serves its own copy older than this (licence: <= 6 h; we keep a margin). */
export const MAX_STALE_MS = 3 * 3600_000;
export const DAILY_CALL_BUDGET = 3000;
/** Of which per-set feeds (a set page or a product page) may use at most this many: the generic feed that the home page shows keeps the rest. */
export const SET_CALL_BUDGET = 1000;
/** One request waits at most this long for a refresh; past it a stale copy (or nothing) is served and the refresh carries on. */
export const REFRESH_DEADLINE_MS = 7000;
const TOKEN_EARLY_MS = 5 * 60_000;
/** Refresh a token this long before it expires: 5 minutes, or a tenth of a short-lived token's life. */
export const tokenMargin = (secs: number) => Math.min(TOKEN_EARLY_MS, (secs * 1000) / 10);

export const MARKETPLACE: Record<Region, { id: string; currency: string; country: string; lang: string }> = {
  au: { id: "EBAY_AU", currency: "AUD", country: "AU", lang: "en-AU" },
  nz: { id: "EBAY_AU", currency: "AUD", country: "AU", lang: "en-AU" }, // NZ buyers use eBay Australia (no EPN program of its own)
  us: { id: "EBAY_US", currency: "USD", country: "US", lang: "en-US" },
  sg: { id: "EBAY_US", currency: "USD", country: "US", lang: "en-US" }, // EBAY_SG has no affiliate URLs
  uk: { id: "EBAY_GB", currency: "GBP", country: "GB", lang: "en-GB" },
  ca: { id: "EBAY_CA", currency: "CAD", country: "CA", lang: "en-CA" }, // EBAY_CA also serves French: ask for English
  eu: { id: "EBAY_DE", currency: "EUR", country: "DE", lang: "de-DE" },
};

/** Per-currency price floor, in that currency: anything cheaper is a pack, a bulk card or junk. */
export const PRICE_FLOOR: Record<string, number> = { USD: 15, AUD: 20, GBP: 12, CAD: 20, EUR: 15 };

// ─── Queries (server-side constants; no user text ever reaches eBay) ──────────────

export const GENERIC_QUERIES = [
  "Charizard ex special illustration rare",
  "Umbreon ex special illustration rare",
  "Pikachu ex special illustration rare",
  "Mega Charizard X ex",
  "Mewtwo ex special illustration rare",
  "PSA 10 Charizard",
] as const;

/** The queries for a ParsedContext.queryKey: "generic", or "set:<code>" (three for the set). Empty for anything else. */
export function queriesFor(queryKey: string): string[] {
  const raw = queryKey === "generic" ? [...GENERIC_QUERIES] : setQueries(queryKey);
  // "Pokemon" in front keeps a set name that is also a common word from matching other things.
  return raw.map((q) => `Pokemon ${q}`.slice(0, 100));
}

function setQueries(queryKey: string): string[] {
  if (!queryKey.startsWith("set:")) return [];
  const set = SET_BY_CODE.get(queryKey.slice(4));
  if (!set) return [];
  const name = set.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "Pokémon GO" → "Pokemon GO"
  return [`${name} special illustration rare`, `${name} alt art`, `${name} chase`];
}

// ─── Pure: request building ────────────────────────────────────────────────────

export function searchFilter(region: Region): string {
  const m = MARKETPLACE[region];
  return [`buyingOptions:{FIXED_PRICE}`, `price:[${PRICE_FLOOR[m.currency]}]`, `priceCurrency:${m.currency}`, `deliveryCountry:${m.country}`].join(",");
}

export function buildSearchUrl(q: string, region: Region, limit: number): string {
  const u = new URL(SEARCH_URL);
  u.searchParams.set("q", q);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("filter", searchFilter(region));
  return u.toString();
}

/** The sub-id the server asks eBay to put in its affiliate URLs; the browser overwrites it per placement. */
export function serverSubId(region: Region): string {
  return affiliateSubId("dex", region, "listings");
}

export function searchHeaders(token: string, region: Region): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Accept-Language": MARKETPLACE[region].lang,
    "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE[region].id,
    "X-EBAY-C-ENDUSERCTX": `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=${serverSubId(region)}`,
  };
}

// ─── Pure: normalise, filter, de-duplicate, spread ──────────────────────────────

// Counterfeits, customs, other languages, lots, sealed product, merchandise: anything that is not one English card.
const JUNK_TITLE = new RegExp(
  "\\b(?:" +
    [
      // counterfeit / not a real card
      "proxy|proxies|custom|replica|reprint|repro|reproduction|orica|fan\\s*art|metal\\s*cards?|digital|code\\s*cards?|fake|counterfeit|unofficial|novelty|altered|handmade|hand\\s*made|diy|ai\\s*generated|pocket|gold\\s*(?:plated|foil|metal|cards?)|acrylic|sticker|poster|keychain|figure|plush|coin|pin|replacement|placeholder|jumbo|oversize|oversized",
      // merchandise
      "(?:art\\s*)?prints?|printed|magnets?|canvas|wall\\s*art|gifts?|toploaders?|holders?|stands?|mat|mats",
      // lots, sealed product and kits: not one card
      "lots?|bulk|damaged|empty|bundle|booster|boxes|box|etb|tin|sealed|case|display|binder|sleeves?|playmat|mystery|random|you\\s*pick|choose|pick\\s*your|complete\\s*set|master\\s*set|\\d+\\s*(?:cards|packs?)|packs?|decks?|kits?|playsets?|(?:ultra\\s*)?premium\\s*collection|special\\s*collection|collection\\s*box|league\\s*battle|build\\s*(?:&|and)\\s*battle|stadium",
      // other languages (and the Japanese product-code styles that do not say "Japanese")
      "japanese|japan|jpn|jp|korean|chinese|german|deutsch|karte|karten|sammelkarte|french|francais|carte|italian|italiano|carta|spanish|espanol|tarjeta|thai|indonesian|portuguese|dutch|russian|vietnamese|polish|turkish|arabic|pokemon\\s*card\\s*game|sv\\d+[a-z]|s\\d+[a-z]|sm\\d+[a-z]",
    ].join("|") +
    ")\\b",
  "i",
);

// A single card names itself: a card number (199/165), a special rarity or a grade. (A bare "ex" or "rare"
// does not: "Charizard ex Special Collection" and "Rare Candy" are not cards worth showing.)
const CARD_SIGNAL = /\b\d{1,3}\s*\/\s*\d{2,3}\b|\b(?:illustration|alt\s*art|full\s*art|sir|psa|bgs|cgc|sgc|promo|trainer\s*gallery)\b/i;

export function isJunkTitle(title: string): boolean {
  return JUNK_TITLE.test(title) || !CARD_SIGNAL.test(title);
}

/** A stable key for "the same photo": the id inside /images/g/<id>/ when there is one, else the path without size or query. */
export function imageKey(imageUrl: string): string {
  try {
    const u = new URL(imageUrl);
    const m = /\/images\/g\/([^/]+)\//.exec(u.pathname);
    return (m ? m[1] : u.pathname.replace(/\/s-l\d+(\.\w+)?$/, "")).toLowerCase();
  } catch {
    return imageUrl;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** The link for an item: eBay's own affiliate URL if it is ours and valid, else itemWebUrl tagged with the EPN parameter set. */
export function itemUrl(it: Record<string, unknown>, region: Region): string | null {
  const aff = it.itemAffiliateWebUrl;
  if (typeof aff === "string" && aff.length <= 2048) {
    try {
      const u = new URL(aff);
      if (u.protocol === "https:" && !u.username && !u.password && isEbayHost(u.hostname) && u.searchParams.get("campid") === EBAY_CAMPAIGN_ID) return u.toString();
    } catch {
      /* fall through to itemWebUrl */
    }
  }
  const web = it.itemWebUrl;
  return typeof web === "string" ? epnTagUrl(web, region, serverSubId(region)) : null;
}

/**
 * One ItemSummary → a Listing, or null when it fails any check. Defensive about every
 * missing field: the Browse API omits fields freely, and none may crash the route.
 */
export function normalizeItem(raw: unknown, region: Region, now: number): Listing | null {
  if (!isRecord(raw)) return null;
  const m = MARKETPLACE[region];
  const id = typeof raw.itemId === "string" && raw.itemId.length > 0 && raw.itemId.length <= 64 ? raw.itemId : null;
  const title = cleanText(raw.title, 80);
  if (!id || !title || isJunkTitle(title)) return null;
  if (raw.adultOnly === true) return null;

  // Active, Buy It Now only: no ended items, no auctions.
  if (Array.isArray(raw.buyingOptions) && !raw.buyingOptions.includes("FIXED_PRICE")) return null;
  if (typeof raw.itemEndDate === "string") {
    const end = Date.parse(raw.itemEndDate);
    if (Number.isFinite(end) && end <= now) return null;
  }

  // The price exactly as eBay returned it, in the marketplace's own currency: a converted one is dropped.
  const price = cleanPrice(raw.price);
  if (!price || price.currency !== m.currency) return null;
  if (isRecord(raw.price) && (raw.price.convertedFromCurrency || raw.price.convertedFromValue)) return null;
  if (Number(price.value) < (PRICE_FLOOR[m.currency] ?? 0)) return null;

  const image = isRecord(raw.image) ? cleanImageUrl(raw.image.imageUrl) : null;
  const thumb = Array.isArray(raw.thumbnailImages) && isRecord(raw.thumbnailImages[0]) ? cleanImageUrl(raw.thumbnailImages[0].imageUrl) : null;
  const imageUrl = image ?? thumb;
  if (!imageUrl) return null;

  const url = itemUrl(raw, region);
  if (!url) return null;

  const condition = cleanText(raw.condition, 24);
  return { id, title, imageUrl, price, url, ...(condition ? { condition } : {}) };
}

/**
 * The strip's items from each query's raw itemSummaries: normalised, then taken
 * ROUND-ROBIN (first of each query, second of each, …) so one query cannot fill the strip,
 * skipping a repeated item id or photo, up to `max`.
 */
export function selectListings(perQuery: readonly (readonly unknown[])[], region: Region, now: number, max = MAX_RETURNED): Listing[] {
  const lists = perQuery.map((raw) => raw.map((it) => normalizeItem(it, region, now)).filter((x): x is Listing => !!x));
  const out: Listing[] = [];
  const ids = new Set<string>();
  const photos = new Set<string>();
  for (let round = 0; out.length < max; round++) {
    let any = false;
    for (const list of lists) {
      if (round >= list.length) continue;
      any = true;
      const it = list[round];
      const key = imageKey(it.imageUrl);
      if (ids.has(it.id) || photos.has(key)) continue;
      ids.add(it.id);
      photos.add(key);
      out.push(it);
      if (out.length >= max) break;
    }
    if (!any) break;
  }
  return out;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface EbayEnv {
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_LISTINGS?: string;
}

/** True when both keys are set and the EBAY_LISTINGS=off kill switch is not. Reads presence only; the values are never used here. */
export function ebayListingsEnabled(env: EbayEnv = process.env as EbayEnv): boolean {
  if ((env.EBAY_LISTINGS ?? "").trim().toLowerCase() === "off") return false;
  return !!(env.EBAY_CLIENT_ID ?? "").trim() && !!(env.EBAY_CLIENT_SECRET ?? "").trim();
}

export interface Deps {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
  env: EbayEnv;
}

export const realDeps = (): Deps => ({
  fetch: (input, init) => fetch(input, init),
  now: () => Date.now(),
  env: process.env as EbayEnv,
});

/**
 * Every failure is one of these: a fixed code and an HTTP status, never eBay's body, a
 * header, a URL or anything of the credentials. The message is the code.
 */
export class EbayError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly retryAfterMs: number | null;
  /** eBay's OAuth error category (a fixed list, never eBay's free text), when it sent one. */
  readonly detail: string | null;
  constructor(code: string, status: number | null = null, retryAfterMs: number | null = null, detail: string | null = null) {
    super(code);
    this.name = "EbayError";
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.detail = detail;
  }
}

// The OAuth error categories (RFC 6749 §5.2) eBay's token endpoint answers with. Only a member of
// this list is ever reported (as the response's `detail`), so no free text, id or secret can leak.
const OAUTH_ERRORS = new Set(["invalid_client", "invalid_request", "invalid_grant", "invalid_scope", "unauthorized_client", "unsupported_grant_type", "access_denied", "temporarily_unavailable"]);

async function oauthError(res: Response): Promise<string | null> {
  try {
    const b: unknown = await res.json();
    const e = isRecord(b) ? b.error : null;
    return typeof e === "string" && OAUTH_ERRORS.has(e) ? e : null;
  } catch {
    return null;
  }
}

// ─── Token manager ─────────────────────────────────────────────────────────────

export interface TokenManager {
  /** A valid token: cached, or fetched once however many callers ask at the same time. */
  get(): Promise<string>;
  /** After a 401 for `bad`: a fresh token (single-flight; a token already replaced since is reused, not fetched again). */
  refresh(bad: string): Promise<string>;
  /** Drop the cache (for tests and the kill switch). */
  reset(): void;
}

export function createTokenManager(deps: Deps): TokenManager {
  let token: { value: string; expiresAt: number } | null = null;
  let inflight: Promise<string> | null = null;

  async function fetchToken(): Promise<string> {
    const id = (deps.env.EBAY_CLIENT_ID ?? "").trim();
    const secret = (deps.env.EBAY_CLIENT_SECRET ?? "").trim();
    if (!id || !secret) throw new EbayError("no-keys");
    let res: Response;
    try {
      res = await deps.fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: OAUTH_SCOPE }).toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new EbayError("token-network");
    }
    if (!res.ok) throw new EbayError(`token-http-${res.status}`, res.status, retryAfter(res), await oauthError(res));
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new EbayError("token-malformed");
    }
    const t = isRecord(body) ? body : {};
    if (typeof t.access_token !== "string" || t.access_token.length < 8 || t.access_token.length > 4096) throw new EbayError("token-malformed");
    const secs = typeof t.expires_in === "number" && Number.isFinite(t.expires_in) ? Math.min(Math.max(t.expires_in, 60), 7200) : 3600;
    token = { value: t.access_token, expiresAt: deps.now() + secs * 1000 - tokenMargin(secs) };
    return token.value;
  }

  function single(): Promise<string> {
    if (!inflight) inflight = fetchToken().finally(() => (inflight = null));
    return inflight;
  }

  return {
    async get() {
      if (token && deps.now() < token.expiresAt) return token.value;
      return single();
    },
    async refresh(bad: string) {
      if (token && token.value !== bad && deps.now() < token.expiresAt) return token.value;
      if (token && token.value === bad) token = null;
      return single();
    },
    reset() {
      token = null;
      inflight = null;
    },
  };
}

/** `p`, or undefined once `ms` have passed (the timer is cleared either way). */
async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<undefined>((r) => (timer = setTimeout(() => r(undefined), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

function retryAfter(res: Response): number | null {
  const v = res.headers.get("retry-after");
  const s = v ? Number(v) : NaN;
  return Number.isFinite(s) && s >= 0 ? Math.min(s, 3600) * 1000 : null;
}

// ─── Client: search, caches, single-flight, budget ─────────────────────────────

export interface ClientOptions {
  dailyBudget?: number;
  setBudget?: number;
  ttlMs?: number;
  deadlineMs?: number;
}

interface Entry {
  items: Listing[];
  fetchedAt: number;
  expiresAt: number;
  /** Built from only some of its queries (the others failed): shown, but cached briefly everywhere. */
  partial: boolean;
}

export interface EbayClient {
  /** Never throws. `reason` says why `items` is empty (or "stale" when a stale copy is served). */
  listings(region: Region, ctx: ParsedContext): Promise<ListingsResponse>;
  /** Searches made today (UTC), for the check script and the tests. */
  callsToday(): number;
  /** …of which for per-set feeds. */
  setCallsToday(): number;
  reset(): void;
}

export function createEbayClient(deps: Deps, opts: ClientOptions = {}): EbayClient {
  const tokens = createTokenManager(deps);
  const budget = opts.dailyBudget ?? DAILY_CALL_BUDGET;
  const setBudget = opts.setBudget ?? SET_CALL_BUDGET;
  const ttl = opts.ttlMs ?? TTL_MS;
  const cache = new Map<string, Entry>();
  const inflight = new Map<string, Promise<void>>();
  const failedUntil = new Map<string, number>();
  const failures = new Map<string, number>(); // consecutive failed refreshes per key
  const lastReason = new Map<string, string>();
  let pausedUntil = 0; // set by a 429, for every key
  let authUntil = 0; // set by a token failure, for every key
  let authFailures = 0;
  let authDetail = ""; // why the last token request failed: "token-http-401:invalid_client" (codes only, no secrets)
  let day = "";
  let used = 0; // searches today, all keys
  let usedSets = 0; // …of which per-set keys

  const today = () => new Date(deps.now()).toISOString().slice(0, 10);
  function rollDay() {
    if (day !== today()) {
      day = today();
      used = 0;
      usedSets = 0;
    }
  }
  /** Can `n` more searches be made now? Per-set keys have their own, smaller allowance so they can never starve the generic feed. */
  function canSpend(n: number, isSet: boolean): boolean {
    rollDay();
    return used + n <= budget && (!isSet || usedSets + n <= Math.min(setBudget, budget));
  }
  function spend(n: number, isSet: boolean): boolean {
    if (!canSpend(n, isSet)) return false;
    used += n;
    if (isSet) usedSets += n;
    return true;
  }

  async function runQuery(q: string, region: Region, limit: number, token: string): Promise<unknown[]> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await deps.fetch(buildSearchUrl(q, region, limit), { headers: searchHeaders(token, region), cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch {
        throw new EbayError("search-network");
      }
      if (res.status === 401 && attempt === 0) {
        token = await tokens.refresh(token); // once; a second 401 is a failure
        continue;
      }
      if (!res.ok) throw new EbayError(`search-http-${res.status}`, res.status, retryAfter(res));
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new EbayError("search-malformed");
      }
      const items = isRecord(body) && Array.isArray(body.itemSummaries) ? body.itemSummaries : [];
      return items.slice(0, 50);
    }
  }

  /** One refresh of one key. Never throws: it records an entry, or a failure for the backoff. */
  async function refresh(key: string, region: Region, ctx: ParsedContext): Promise<void> {
    const now = deps.now();
    const queries = queriesFor(ctx.queryKey);
    if (!queries.length) {
      lastReason.set(key, "bad-context");
      return;
    }
    if (now < pausedUntil) {
      lastReason.set(key, "rate-limited");
      return;
    }
    if ((failedUntil.get(key) ?? 0) > now) return; // backing off: keep whatever reason is recorded
    if (now < authUntil) {
      lastReason.set(key, "auth");
      return;
    }
    const isSet = ctx.queryKey.startsWith("set:");
    if (!canSpend(queries.length, isSet)) {
      lastReason.set(key, "budget");
      return;
    }
    const limit = Math.max(1, Math.floor(MAX_FETCHED / queries.length));
    let results: PromiseSettledResult<unknown[]>[];
    try {
      const token = await tokens.get(); // a token failure costs no budget and pauses every key (below)
      authFailures = 0;
      if (!spend(queries.length, isSet)) {
        lastReason.set(key, "budget");
        return;
      }
      results = await Promise.allSettled(queries.map((q) => runQuery(q, region, limit, token)));
    } catch (e) {
      results = queries.map(() => ({ status: "rejected" as const, reason: e }));
    }
    const ok = results.filter((r): r is PromiseFulfilledResult<unknown[]> => r.status === "fulfilled");
    const bad = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (!ok.length) {
      const err = bad[0]?.reason;
      const e = err instanceof EbayError ? err : new EbayError("error");
      if (e.status === 429) {
        pausedUntil = deps.now() + Math.min(Math.max(e.retryAfterMs ?? 0, RATE_LIMIT_MIN_MS), RATE_LIMIT_MAX_MS);
        lastReason.set(key, "rate-limited");
      } else if (e.code.startsWith("token")) {
        // The keyset or the token endpoint is the problem, not this key: pause every key, backing off 1, 2, 4 … 15 min.
        authFailures++;
        authUntil = deps.now() + Math.min(FAILURE_BACKOFF_MS * 2 ** (authFailures - 1), FAILURE_BACKOFF_MAX_MS);
        authDetail = e.detail ? `${e.code}:${e.detail}` : e.code;
        lastReason.set(key, "auth");
      } else {
        lastReason.set(key, "unavailable");
      }
      const n = (failures.get(key) ?? 0) + 1;
      failures.set(key, n);
      failedUntil.set(key, deps.now() + Math.min(FAILURE_BACKOFF_MS * 2 ** (n - 1), FAILURE_BACKOFF_MAX_MS));
      return;
    }
    const done = deps.now();
    const items = selectListings(ok.map((r) => r.value), region, done);
    const life = bad.length ? PARTIAL_TTL_MS : items.length ? ttl : EMPTY_TTL_MS;
    cache.set(key, { items, fetchedAt: done, expiresAt: done + life, partial: bad.length > 0 });
    lastReason.delete(key);
    failedUntil.delete(key);
    failures.delete(key);
    if (bad.length) failedUntil.set(key, done + FAILURE_BACKOFF_MS);
  }

  return {
    async listings(region, ctx) {
      const now = deps.now();
      const iso = (t: number) => new Date(t).toISOString();
      if (!ebayListingsEnabled(deps.env)) {
        return { items: [], asOf: iso(now), reason: (deps.env.EBAY_LISTINGS ?? "").trim().toLowerCase() === "off" ? "off" : "no-keys" };
      }
      const key = `${MARKETPLACE[region].id}|${ctx.queryKey}`;
      let e = cache.get(key);
      if (!e || now >= e.expiresAt) {
        let p = inflight.get(key);
        if (!p) {
          p = refresh(key, region, ctx).finally(() => inflight.delete(key));
          inflight.set(key, p);
        }
        await withDeadline(p, opts.deadlineMs ?? REFRESH_DEADLINE_MS); // refresh() never rejects; past the deadline it carries on and this request serves what it has
        e = cache.get(key);
      }
      const t = deps.now();
      if (e && t - e.fetchedAt <= MAX_STALE_MS) {
        const fresh = t < e.expiresAt;
        const reason = !fresh ? "stale" : e.partial ? "partial" : !e.items.length ? "empty" : null;
        return { items: e.items, asOf: iso(e.fetchedAt), ...(reason ? { reason } : {}) };
      }
      const reason = lastReason.get(key) ?? "unavailable";
      return { items: [], asOf: iso(t), reason, ...(reason === "auth" && authDetail ? { detail: authDetail } : {}) };
    },
    callsToday: () => (day === today() ? used : 0),
    setCallsToday: () => (day === today() ? usedSets : 0),
    reset() {
      cache.clear();
      inflight.clear();
      failedUntil.clear();
      failures.clear();
      lastReason.clear();
      pausedUntil = 0;
      authUntil = 0;
      authFailures = 0;
      used = 0;
      usedSets = 0;
      day = "";
      tokens.reset();
    },
  };
}

let shared: EbayClient | null = null;
/** The process-wide client the route uses: one token, one cache, one budget per server instance. */
export function ebayClient(): EbayClient {
  return (shared ??= createEbayClient(realDeps()));
}
