// Amazon Associates (Australia): plain links to amazon.com.au carrying the owner's tracking tag (2026-10-26, the owner: "add Amazon
// Associates (Australia) affiliate links … to earn the 3 qualifying sales needed to approve our Associates account").
//
// WHAT A LINK IS. https://www.amazon.com.au/dp/<ASIN>?tag=<tag> for a product we know the ASIN of, else a search,
// https://www.amazon.com.au/s?k=<product name>&tag=<tag>. Direct links only: no shortener, no redirect through our domain, no cloaking
// (the Associates operating agreement requires the link to be what it says). target="_blank", rel="sponsored nofollow noopener": no
// noreferrer, so Amazon sees the click came from the site registered to the account.
//
// WHAT IT NEVER SAYS. We have no Product Advertising API access: no Amazon price, rating, stock or "Prime" claim anywhere, only
// "Check price on Amazon AU". Amazon is never a row of the price table (that table is ranked by price, and Amazon has none we know).
//
// WHERE. Australia, and New Zealand (Amazon AU delivers there for many items; the row says to check). Not the US, UK, Canada or
// Europe (each has its own Amazon and its own Associates programme), and not Singapore (amazon.sg is a separate store).
//
// The tag: AMAZON_AU_TAG (server-side, read at render), default compareempire-22. A malformed value falls back to the default rather
// than sending clicks with a broken tag. Pure: tests/amazon.test.ts.
import type { Region } from "./regions";

export const AMAZON_AU_DEFAULT_TAG = "compareempire-22";
export const AMAZON_AU_HOST = "www.amazon.com.au";
/** Exactly the owner's spec: sponsored and nofollow for search engines, noopener for the new tab. */
export const AMAZON_REL = "sponsored nofollow noopener";
/** The retailer name in buy_click and the label on every button. */
export const AMAZON_AU_RETAILER = "Amazon AU";
/** The Associates programme's required statement, word for word (the footer, the disclosure page, beside the buttons). */
export const AMAZON_ASSOCIATE_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";

/** The regions shown Amazon AU links. */
export const AMAZON_AU_REGIONS: readonly Region[] = ["au", "nz"];
export const showsAmazonAu = (region: Region | null | undefined): boolean => !!region && AMAZON_AU_REGIONS.includes(region);

/** Where on the site an Amazon link sits: the amazon_click and buy_click events' placement. */
export const AMAZON_PLACEMENTS = [
  "amazon-product", // product page: the Marketplaces panel's Amazon AU row
  "amazon-soldout", // product page, sold out: the button in the sold-out callout's marketplace box
  "amazon-preorder", // pre-order page: the Amazon AU row under eBay and TCGplayer
  "amazon-set", // set page: "Check <set> on Amazon AU"
  "amazon-type", // type page: "Check <type> on Amazon AU"
  "amazon-guide", // a guide's closing "Where to buy" section
  "amazon-guide-pick", // a guide's per-product "Check price on Amazon AU" links (the Australian buying guides)
] as const;
export type AmazonPlacement = (typeof AMAZON_PLACEMENTS)[number];

/** A tracking ID as Amazon issues them: lowercase letters, digits and hyphens, ending -20 to -29 (AU IDs end -22). */
const TAG_RE = /^[a-z0-9][a-z0-9-]{1,60}-2\d$/;

export function amazonAuTag(env: Record<string, string | undefined> = process.env): string {
  const t = env.AMAZON_AU_TAG?.trim().toLowerCase();
  return t && TAG_RE.test(t) ? t : AMAZON_AU_DEFAULT_TAG;
}

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

/** The product's page when we know its ASIN, else a search for its name: always the owner's tag, always amazon.com.au. */
export function amazonAuUrl(o: { name: string; asin?: string | null }, tag = amazonAuTag()): string {
  if (isAsin(o.asin)) return `https://${AMAZON_AU_HOST}/dp/${o.asin}?tag=${encodeURIComponent(tag)}`;
  const u = new URL(`https://${AMAZON_AU_HOST}/s`);
  u.searchParams.set("k", amazonQuery(o.name));
  u.searchParams.set("tag", tag);
  return u.toString();
}

/**
 * Known ASINs, by product slug: a product here links straight to its Amazon page; everything else is a search. Empty until an ASIN
 * is checked by hand on amazon.com.au (the listing must be the same English-language product): never guessed.
 */
export const AMAZON_AU_ASINS: Readonly<Record<string, string>> = {
  // Checked 2026-10-26 against each listing's own title and contents on amazon.com.au (the ten Australian booster boxes, ETBs and
  // bundles in stock at the most stores). Left as searches: the Chaos Rising and Pitch Black displays (no pack count on the listing,
  // and Amazon AU also sells 18-pack displays), Surging Sparks' (unavailable), Perfect Order's and Delta Reign's (no listing found).
  "pitch-black-elite-trainer-box": "B0GYVHLP4L", // "Pokemon TCG Mega Evolutions 5 Pitch Black Elite Trainer Box" (9 packs, Zarude promo)
  "chaos-rising-elite-trainer-box": "B0GR6N18F6", // "Pokemon TCG Mega Evolutions 4 Elite Trainer Box" (Mega Evolution 4 = Chaos Rising, me4)
  "chaos-rising-booster-bundle": "B0GR6Q72ND", // "Pokemon TCG Mega Evolutions 4 Booster Bundles" (model "Chaos Rising"; six booster packs)
  "ascended-heroes-elite-trainer-box": "B0G3CY83L5", // "Pokemon TCG ME2.5 Ascended Heroes Elite Trainer Box" (9 packs)
  "destined-rivals-elite-trainer-box": "B0F2BDXW4J", // "Pokemon TCG Scarlet & Violet 10 Destined Rivals Elite Trainer Box" (9 packs, sold by Pokémon)
};

export const amazonAuHref = (slug: string, name: string, tag?: string): string => amazonAuUrl({ name, asin: AMAZON_AU_ASINS[slug] ?? null }, tag);
