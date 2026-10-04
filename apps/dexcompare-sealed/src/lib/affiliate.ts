// Outbound links. The site earns only through affiliate links, and only two:
//   • eBay Partner Network, as plain SEARCH links: zero eBay API calls, no
//     quota, no keys — the old DexCompare's Browse-API importer is gone for good.
//   • TCGplayer via Impact: every tcgplayer.com link is wrapped in the partner
//     deep link at render time. The database only ever holds the plain URL.
// Store links go out untouched.
//
// Pure (no database, no store registry): BrowseGrid imports this in the browser.
import { REGIONS, type Region } from "./regions";

// ─── Placements ────────────────────────────────────────────────────────────────
// Where on the site an outbound link sits. One list for both jobs: the affiliate
// sub-id (EPN customid / Impact sharedid, so the networks' reports say which
// surface earned) and the buy_click event (components/OutboundLink.tsx).
export const PLACEMENTS = [
  "product-best", // product page: the best-price card's button
  "product-marketplace", // product page: the Marketplaces panel under it
  "product-soldout", // product page: the sold-out callout
  "product-table", // product page: the offer table, stores and marketplaces
  "set-banner",
  "type-banner",
  "browse-empty", // /[region]/sealed with nothing matching the filters
  "region-home",
  "store-page", // a store's "Visit" link
  // eBay units (components/Ebay.tsx). One placement per distinct surface, so
  // EPN's customid report and Vercel's buy_click say which surface earned.
  "header", // the "eBay" item in the site header (desktop nav and the mobile section row)
  "region-home-hero", // region home: the banner under the hero
  "feed", // an in-feed tile in a product grid with no more specific placement (home rails)
  "browse-feed", // /[region]/sealed (+ pages): in-feed tile
  "set-feed", // set page: in-feed tile
  "type-feed", // type page: in-feed tile
  "card-soldout", // "Sold out here — search eBay" under a sold-out product card
  "product-related", // product page: set x type searches inside the marketplace panel
  "product-after-table", // product page: "Still deciding?" row closing the offer table
  "set-related", // set page: set x type searches in the banner
  "releases-card", // release calendar: a set's own search link
  "releases-banner", // release calendar: banner at the bottom
  "store-banner", // store directory and store page: "Not in stock at the stores?"
  "pre-footer", // every region page: banner directly above the site footer
  "footer", // the "Shop Pokémon sealed on eBay" link in the site footer
  "not-found", // the 404 page
] as const;
export type Placement = (typeof PLACEMENTS)[number];

// Both networks give us one free-text field per click, and it is the only way
// to learn WHERE revenue comes from. Format: dex-<region>-<placement>, e.g.
// `dex-au-product-marketplace`. Sanitised hard (from Rift Compare): EPN silently
// drops a click whose customid holds anything outside a conservative set, and a
// dropped click looks exactly like no revenue. 60 chars is well inside both
// EPN's and Impact's limits.
const SUBID_MAX = 60;
export function affiliateSubId(...parts: (string | null | undefined)[]): string {
  const s = parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return s.slice(0, SUBID_MAX).replace(/-$/, "") || "dex";
}

function subId(region: Region, placement: Placement): string {
  return affiliateSubId("dex", region, placement);
}

// A product or set name as a search query. Product names are store titles, so
// they can carry store notes that match nothing on eBay (which requires every
// word) or TCGplayer ("…Sylveon ex Box - LIMIT 1 PER CUSTOMER - LOCAL PICKUP
// ONLY" finds 0 results there; "30th Celebration Sylveon ex Box" finds it).
// Out: accents (the listings mostly say "Pokemon"), purchase limits, pickup
// and pre-order notes, bracketed store SKU codes ("[MCAP - 000]", "(SBC)",
// "[30C]"), brackets, stray dashes, and a leading "-" or quotes, which eBay
// reads as "exclude this word" or a phrase ("Yokohama Deck -Pikachu").
export function searchTerms(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(?:limit|max)\s*(?:of\s*)?\d+(?:\s*(?:per|\/)\s*(?:customer|household|order|person))?\b/gi, " ")
    .replace(/\b(?:one|\d+)\s*(?:per|\/)\s*(?:customer|household|order|person)\b/gi, " ")
    .replace(/\blocal\s*pick\s*-?\s*up(?:\s*only)?\b|\bin[-\s]?store\s*(?:pick\s*-?\s*up\s*)?only\b/gi, " ")
    .replace(/\bpre[-\s]?orders?\b|\bpre-?prder\b|\bpresale\b|\binvite\s*only\b/gi, " ")
    // Store-listing noise that matches nothing on eBay (which requires every word).
    .replace(/\bcollection\s+only\b|\bon\s+sale\b|\b(?:random|assorted)(?:\s+(?:style|design|colou?r|artwork))?\b|\bpack\s+lineup\s+in\s+description\b|\bmiscellaneous\s+cards?\s*&\s*products?\b|\b\d+%\s*vat\b|\bvat\b|\bsale\b/gi, " ")
    // A code has a letter in it: "(2025)", "(151)" and "(24)" are part of the name.
    .replace(/[[(]\s*(?!\d+\s*[\])])[A-Z0-9]{2,6}(?:\s*-\s*\d+)?\s*[\])]/g, " ")
    .replace(/[[\]|()"“”]/g, " ")
    .replace(/(^|\s)[-–—:]+(?=\s|$)/g, " ")
    .replace(/(^|\s)-+(?=\S)/g, "$1")
    .replace(/(\S)-+(?=\s|$)/g, "$1") // a dangling "ONLY-" from a removed note
    .replace(/\s+/g, " ")
    .trim();
}

// ─── eBay (EPN search links) ───────────────────────────────────────────────────

// EPN campaign id (public — it appears in every tagged URL). `||` so an empty
// env var still falls back to the real id rather than silently un-tagging links.
export const EBAY_CAMPAIGN_ID = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || "5339155912";

// EPN rotation ids per eBay site (mkrid) and the site id. SG and NZ have no EPN
// program of their own: NZ buyers use eBay Australia, SG buyers eBay US.
const EPN: Record<string, { mkrid: string; siteid: string }> = {
  "www.ebay.com.au": { mkrid: "705-53470-19255-0", siteid: "15" },
  "www.ebay.com": { mkrid: "711-53200-19255-0", siteid: "0" },
  "www.ebay.co.uk": { mkrid: "710-53481-19255-0", siteid: "3" },
  "www.ebay.ca": { mkrid: "706-53473-19255-0", siteid: "2" },
  "www.ebay.de": { mkrid: "707-53477-19255-0", siteid: "77" },
};
const EBAY_FOR_REGION: Record<Region, string> = {
  au: "www.ebay.com.au",
  nz: "www.ebay.com.au",
  us: "www.ebay.com",
  uk: "www.ebay.co.uk",
  ca: "www.ebay.ca",
  eu: "www.ebay.de",
  sg: "www.ebay.com",
};

/**
 * An EPN-tagged eBay Buy It Now search for Pokémon sealed product, on the
 * region's eBay site. `name` is a product, set or type name, or "" for any.
 */
export function ebaySearchUrl(name: string, region: Region, placement: Placement): string {
  const host = EBAY_FOR_REGION[region];
  const epn = EPN[host];
  const terms = searchTerms(name);
  const q = /\bpokemon\b/i.test(terms) ? `${terms} sealed` : `Pokemon ${terms} sealed`;
  const u = new URL(`https://${host}/sch/i.html`);
  u.searchParams.set("_nkw", q.replace(/\s+/g, " ").trim());
  u.searchParams.set("LH_BIN", "1"); // Buy It Now: a price you can actually pay
  u.searchParams.set("mkevt", "1"); // required: marks the click as a tracked EPN event
  u.searchParams.set("mkcid", "1");
  u.searchParams.set("mkrid", epn.mkrid);
  u.searchParams.set("siteid", epn.siteid);
  u.searchParams.set("campid", EBAY_CAMPAIGN_ID);
  u.searchParams.set("toolid", "10001");
  u.searchParams.set("customid", subId(region, placement));
  return u.toString();
}

/**
 * The one-line disclosure that sits beside every group of affiliate links (the
 * FTC wants it next to the links, not only in the footer). Pure, so the eBay
 * units and the Marketplaces panel share it without importing each other.
 */
export const AFFILIATE_NOTE = "Affiliate links — we may earn a commission, at no cost to you.";
/** …and the shorter form for a single small link (a sold-out card's), which has no room for the full line. */
export const AFFILIATE_NOTE_SHORT = "Affiliate link — we may earn a commission.";

/** The eBay site a region's links actually land on: "ebay.com.au" (also for NZ), "ebay.com" (also for SG). */
export function ebayLabel(region: Region): string {
  return EBAY_FOR_REGION[region].replace(/^www\./, "");
}

// ─── Optional official EPN banner creative ─────────────────────────────────────
// The owner can paste an image and tracking link copied from EPN Campaign
// Manager into NEXT_PUBLIC_EBAY_BANNER_IMAGE / _HREF (optionally _WIDTH, _HEIGHT,
// _ALT). Both set and valid → the "hero" and "footer" banners show that image
// instead of the native banner. Anything else is ignored, never half-applied:
// the page must not break, or link somewhere odd, because of a typo in an env var.

export interface EbayBannerCreative {
  image: string;
  href: string;
  width: number;
  height: number;
  alt: string;
}

const BANNER_DEFAULT = { width: 728, height: 90, alt: "Shop Pokémon sealed on eBay (advertisement)" };

function httpsUrl(raw: string | undefined): URL | null {
  const v = (raw ?? "").trim();
  if (!v || v.length > 2048) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password) return null;
    return u;
  } catch {
    return null;
  }
}

/** ebay.<tld> (com, com.au, co.uk, ca, de…), its subdomains (rover.ebay.com), or the ebay.us short-link host. */
export function isEbayHost(host: string): boolean {
  return /(^|\.)ebay\.(?:com|com\.au|co\.uk|ca|de|fr|it|es|ie|nl|at|ch|com\.sg|us)$/i.test(host);
}

function dimension(raw: string | undefined, fallback: number, min: number, max: number): number | null {
  const v = (raw ?? "").trim();
  if (!v) return fallback;
  if (!/^\d{1,4}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/** Where EPN's own creatives are served from: eBay's hosts, ebayimg.com and ebaystatic.com. Nothing else is loaded as an ad image. */
export function isEbayImageHost(host: string): boolean {
  return isEbayHost(host) || /(^|\.)(?:ebayimg|ebaystatic)\.com$/i.test(host);
}

export function parseEbayBanner(env: { image?: string; href?: string; width?: string; height?: string; alt?: string }): EbayBannerCreative | null {
  const image = httpsUrl(env.image);
  const href = httpsUrl(env.href);
  if (!image || !href || !isEbayHost(href.hostname) || !isEbayImageHost(image.hostname)) return null;
  // A tracking link carries our campaign id; one without it, or with another's, earns nothing for us.
  // (ebay.us short links hide the campaign in the redirect, so they are taken as pasted.)
  if (!/(^|\.)ebay\.us$/i.test(href.hostname) && href.searchParams.get("campid") !== EBAY_CAMPAIGN_ID) return null;
  const width = dimension(env.width, BANNER_DEFAULT.width, 100, 1200);
  const height = dimension(env.height, BANNER_DEFAULT.height, 30, 700);
  if (width == null || height == null) return null;
  const alt = (env.alt ?? "").replace(/\s+/g, " ").trim().slice(0, 140) || BANNER_DEFAULT.alt;
  return { image: image.toString(), href: href.toString(), width, height, alt };
}

/**
 * The creative's link for a region and placement: the pasted tracking link with
 * our customid (dex-<region>-<placement>) filled in when it has none, so EPN's
 * report can tell the hero from the banner above the footer. Short links
 * (ebay.us) and links that already carry a customid are left as pasted.
 */
export function creativeHref(href: string, region: Region, placement: Placement): string {
  const u = new URL(href);
  if (!u.searchParams.has("campid") || u.searchParams.get("customid")) return href;
  u.searchParams.set("customid", subId(region, placement));
  return u.toString();
}

/** The retailer label of a creative's click: the host the link really goes to, which is not always the region's eBay site. */
export function creativeRetailer(href: string): string {
  return `eBay (${new URL(href).hostname.replace(/^www\./, "")})`;
}

// Literal property reads: Next inlines NEXT_PUBLIC_* at build only for these.
export const EBAY_BANNER: EbayBannerCreative | null = parseEbayBanner({
  image: process.env.NEXT_PUBLIC_EBAY_BANNER_IMAGE,
  href: process.env.NEXT_PUBLIC_EBAY_BANNER_HREF,
  width: process.env.NEXT_PUBLIC_EBAY_BANNER_WIDTH,
  height: process.env.NEXT_PUBLIC_EBAY_BANNER_HEIGHT,
  alt: process.env.NEXT_PUBLIC_EBAY_BANNER_ALT,
});

// ─── TCGplayer (Impact deep links) ─────────────────────────────────────────────

// TCGplayer's affiliate program runs through Impact (approved; the same account
// as Rift Compare). Public: it appears in every wrapped URL. `||` so an empty env
// var falls back to the approved link instead of un-monetising every click.
export const TCGPLAYER_IMPACT_LINK = process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_LINK || "https://partner.tcgplayer.com/c/7385758/1780961/21018";

// Impact's site-ownership token for this account's promotional properties. The
// same token every CompareEmpire site renders (and the old DexCompare did on
// this domain); Impact re-checks a property for it. Rendered by app/layout.tsx.
export const IMPACT_SITE_VERIFICATION = "ebb0400c-dec0-45ae-a56e-e7bb1596e965";

// TCGPLAYER.key in stores.ts. Not imported from there: stores.ts pulls in the
// whole store registry, and this module ships to the browser.
export const TCGPLAYER_KEY = "tcgplayer";

function impactHost(): string | null {
  try {
    return new URL(TCGPLAYER_IMPACT_LINK).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Wrap a tcgplayer.com URL in the Impact deep link. Anything else comes back
 * untouched: another host (including look-alikes such as tcgplayer.com.evil.com),
 * a non-https URL, a relative one, or a link that is already wrapped.
 */
export function tcgplayerAffiliateUrl(url: string, region: Region, placement: Placement): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || !/(?:^|\.)tcgplayer\.com$/.test(host)) return url;
  if (host === impactHost()) return url; // partner.tcgplayer.com: already wrapped
  return `${TCGPLAYER_IMPACT_LINK}?u=${encodeURIComponent(url)}&sharedid=${encodeURIComponent(subId(region, placement))}`;
}

/**
 * A TCGplayer search for Pokémon sealed product, wrapped. For when we have no
 * matched TCGplayer product: `name` is the product, set or type name ("" = all
 * Pokémon sealed). TCGplayer is a US marketplace whatever the region.
 */
export function tcgplayerSearchUrl(name: string, region: Region, placement: Placement): string {
  const u = new URL("https://www.tcgplayer.com/search/pokemon/product");
  u.searchParams.set("productLineName", "pokemon");
  // The product line already says Pokémon; the word itself only narrows the
  // match. Except in "Pokémon Center", which names a product.
  const q = searchTerms(name).replace(/\bpokemon\b(?! center)/gi, " ").replace(/\s+/g, " ").trim();
  if (q) u.searchParams.set("q", q);
  u.searchParams.set("view", "grid");
  u.searchParams.set("ProductTypeName", "Sealed Products");
  return tcgplayerAffiliateUrl(u.toString(), region, placement);
}

// ─── One answer for every offer link ───────────────────────────────────────────

/** rel for paid links. A visible disclosure sits next to each group of them. */
export const REL_SPONSORED = "sponsored nofollow noopener noreferrer";
/** rel for plain store links: we don't vouch for them, and don't pass PageRank. */
export const REL_STORE = "nofollow noopener";

export interface OutboundHref {
  href: string;
  rel: string;
  /** True when the link earns us a commission (the UI discloses it). */
  sponsored: boolean;
}

/**
 * The link for an Offer row: TCGplayer's is wrapped and sponsored; a store's is
 * its own URL, untouched. `sponsored` is true only if the URL really was wrapped.
 */
export function offerLink(store: string, url: string, region: Region, placement: Placement): OutboundHref {
  if (store === TCGPLAYER_KEY) {
    const href = tcgplayerAffiliateUrl(url, region, placement);
    if (href !== url) return { href, rel: REL_SPONSORED, sponsored: true };
  }
  return { href: url, rel: REL_STORE, sponsored: false };
}

// ─── Click-event labels ────────────────────────────────────────────────────────
// The `retailer` property of buy_click (components/OutboundLink.tsx). Readable in
// Vercel's Events view as they stand: "Pokebox (AU)", "TCGplayer", "eBay (ebay.com.au)".

export const TCGPLAYER_RETAILER = "TCGplayer";

export function storeRetailer(storeName: string, market: string): string {
  return `${storeName} (${market})`;
}

export function offerRetailer(store: string, storeName: string, market: string): string {
  return store === TCGPLAYER_KEY ? TCGPLAYER_RETAILER : storeRetailer(storeName, market);
}

/** Names the site the click actually lands on, so NZ reads "eBay (ebay.com.au)". */
export function ebayRetailer(region: Region): string {
  return `eBay (${ebayLabel(region)})`;
}

export function regionName(region: Region): string {
  return REGIONS[region].name;
}
