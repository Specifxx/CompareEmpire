// Amazon Associates: plain links to each region's Amazon carrying the owner's tracking tag. Amazon AU since 2026-10-26 (the owner: "add
// Amazon Associates (Australia) affiliate links … to earn the 3 qualifying sales needed to approve our Associates account"); Amazon US
// since 2026-10-29 (the owner: "we are now earning money through our Amazon affiliates … are we also putting it in our DexCompare?"):
// Pokémon sealed sells on amazon.com, and the US is DexCompare's biggest market.
//
// WHAT A LINK IS. https://<host>/dp/<ASIN>?tag=<tag> for a product we know the ASIN of, else a search,
// https://<host>/s?k=<product name>&tag=<tag>, plus ascsubtag=dex-<region>-<placement> when the link knows where it sits (Associates
// reports break earnings out by it). Direct links only: no shortener, no redirect through our domain, no cloaking (the Associates
// operating agreement requires the link to be what it says). target="_blank", rel="sponsored nofollow noopener": no noreferrer, so
// Amazon sees the click came from the site registered to the account.
//
// WHAT IT NEVER SAYS. We have no Product Advertising API access: no Amazon price, rating, stock or "Prime" claim anywhere, only
// "Check price on Amazon US/AU". Amazon is never ranked with the stores (it has no price we know): on the product page it is a search
// row pinned under eBay and TCGplayer, like their search rows, never the best price.
//
// WHERE. Each Amazon store has its own Associates tag, hard-coded (owner, 2026-11-02: no Vercel variable decides a tag): Australia
// (amazon.com.au, dexcompare-22) and New Zealand (Amazon AU delivers there for many items; the row says to check); the US
// (amazon.com, riftcompare-20); the UK (amazon.co.uk, compareempi03-21); Canada (amazon.ca, compareempire-20); the eurozone
// (amazon.de, compareempire-21). Not Singapore (amazon.sg has no Associates programme).
//
// Read on the server (pages and server components build every href). Pure: tests/amazon.test.ts.
import { REGIONS, type Region } from "./regions";

export const AMAZON_AU_DEFAULT_TAG = "dexcompare-22";
export const AMAZON_US_DEFAULT_TAG = "riftcompare-20";
export const AMAZON_AU_HOST = "www.amazon.com.au";
/** Exactly the owner's spec: sponsored and nofollow for search engines, noopener for the new tab. */
export const AMAZON_REL = "sponsored nofollow noopener";
/** The retailer name in buy_click for Amazon AU (kept: the reports since 2026-10-26 use it). */
export const AMAZON_AU_RETAILER = "Amazon AU";
/** The Associates programme's required statement, word for word (the footer, the disclosure page, beside the buttons). */
export const AMAZON_ASSOCIATE_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";
/** Amazon's trademark notice (Operating Agreement Dos and Don'ts, 2026-11-02), in the footer of every page. */
export const AMAZON_TRADEMARK = "Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates.";

/** One Amazon store: its host, the label on every button ("Amazon US"), the currency it charges in, and its tag. */
export interface AmazonStore {
  host: string;
  label: string;
  currency: string;
  tag: string;
}
const AU: AmazonStore = { host: AMAZON_AU_HOST, label: AMAZON_AU_RETAILER, currency: "Australian dollars", tag: AMAZON_AU_DEFAULT_TAG };
export const AMAZON_STORES: Readonly<Partial<Record<Region, AmazonStore>>> = {
  au: AU,
  nz: AU,
  us: { host: "www.amazon.com", label: "Amazon US", currency: "US dollars", tag: AMAZON_US_DEFAULT_TAG },
  uk: { host: "www.amazon.co.uk", label: "Amazon UK", currency: "pounds", tag: "compareempi03-21" },
  ca: { host: "www.amazon.ca", label: "Amazon CA", currency: "Canadian dollars", tag: "compareempire-20" },
  eu: { host: "www.amazon.de", label: "Amazon DE", currency: "euros", tag: "compareempire-21" },
};

/** The region's Amazon store and its tag, or null when the region has none (Singapore). */
export function amazonFor(region: Region | null | undefined): AmazonStore | null {
  return (region && AMAZON_STORES[region]) || null;
}

/** The regions shown Amazon links today. */
export const amazonRegions = (): Region[] => (Object.keys(REGIONS) as Region[]).filter((r) => amazonFor(r));
export const showsAmazon = (region: Region | null | undefined): boolean => amazonFor(region) != null;
/** The region's Amazon label ("Amazon US"), or "Amazon" when it has none. */
export const amazonLabel = (region: Region | null | undefined): string => (region && AMAZON_STORES[region]?.label) || "Amazon";

/** Where on the site an Amazon link sits: the amazon_click and buy_click events' placement. */
export const AMAZON_PLACEMENTS = [
  "amazon-table", // product page: the Amazon row pinned in the price table, under eBay and TCGplayer
  "amazon-product", // product page: the Marketplaces panel's Amazon row
  "amazon-soldout", // product page, sold out: the button in the sold-out callout's marketplace box
  "amazon-preorder", // pre-order page: the Amazon row under eBay and TCGplayer
  "amazon-set", // set page: "Check <set> on Amazon"
  "amazon-type", // type page: "Check <type> on Amazon"
  "amazon-guide", // a guide's closing "Where to buy" section
  "amazon-guide-pick", // a guide's per-product "Check price on Amazon" links (the Australian buying guides)
  "amazon-japanese", // the Japanese section (/[region]/japanese): "Check Japanese boxes on Amazon"
] as const;
export type AmazonPlacement = (typeof AMAZON_PLACEMENTS)[number];


/** Amazon AU's tag. */
export const amazonAuTag = (): string => AMAZON_AU_DEFAULT_TAG;

/** An ASIN: ten characters, letters and digits (B0… for most; ISBN-10s for books). */
export const isAsin = (v: string | null | undefined): v is string => !!v && /^[A-Z0-9]{10}$/.test(v);

/** What to search Amazon for: the product's name without store notes (purchase limits, SKU codes), and "Pokemon" once. */
export function amazonQuery(name: string): string {
  const q = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]|\([^)]*\b(?:limit|pickup|pre-?order|sku)\b[^)]*\)/gi, " ")
    .replace(/\b(?:limit \d+ per customer|local pickup only|pre-?order)\b/gi, " ")
    .replace(/[^\p{L}\p{N}&'.:+ -]+/gu, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /\bpokemon\b/i.test(q) ? q : `Pokemon ${q}`.trim();
}

/**
 * The product's page on the region's Amazon when we know its ASIN there, else a search for its name: always the owner's tag for that
 * store, and the placement as ascsubtag (dex-<region>-<placement>). Null when the region shows no Amazon.
 */
export function amazonUrl(region: Region, o: { name: string; asin?: string | null }, placement?: AmazonPlacement): string | null {
  const a = amazonFor(region);
  if (!a) return null;
  const u = new URL(isAsin(o.asin) ? `https://${a.host}/dp/${o.asin}` : `https://${a.host}/s`);
  if (!isAsin(o.asin)) u.searchParams.set("k", amazonQuery(o.name));
  u.searchParams.set("tag", a.tag);
  if (placement) u.searchParams.set("ascsubtag", `dex-${region}-${placement}`);
  return u.toString();
}

/** amazon.com.au, the AU tag, no sub-tag: the form the Australian links had before 2026-10-29 (kept for tests and callers). */
export const amazonAuUrl = (o: { name: string; asin?: string | null }): string => amazonUrl("au", o)!;

/**
 * Known ASINs, by Amazon host and product slug: a product here links straight to its Amazon page; everything else is a search. Empty
 * until an ASIN is checked by hand on that Amazon (the listing must be the same English-language product): never guessed.
 */
export const AMAZON_ASINS: Readonly<Record<string, Readonly<Record<string, string>>>> = { [AMAZON_AU_HOST]: {}, "www.amazon.com": {} };

/** A product's Amazon link in a region (its ASIN there, else a search for its name), or null where the region shows no Amazon. */
export function amazonHref(region: Region, slug: string, name: string, placement?: AmazonPlacement): string | null {
  const host = AMAZON_STORES[region]?.host;
  return amazonUrl(region, { name, asin: (host && AMAZON_ASINS[host]?.[slug]) || null }, placement);
}
