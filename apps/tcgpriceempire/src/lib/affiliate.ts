// Affiliate / partner identifiers. These are PUBLIC by design — they appear in
// outbound URLs and in the page HTML — so they're safe as code defaults (override
// via env if you ever rotate them). Same programs as the sister sites: one eBay
// EPN campaign, one Amazon Associates account, one Impact (TCGplayer) contract.

// eBay Partner Network campaign id. `||` (not `??`) so an empty-string env var
// still falls back — an empty campaign id silently un-monetises every eBay link.
export const EBAY_CAMPAIGN_ID = process.env.EBAY_AFFILIATE_CAMPAIGN || "5339155912";

// Amazon Associates tracking id. Add tcgpriceempire.com to the Amazon Associates
// account's site list before launch (SETUP.md) — until a dedicated tag exists the
// shared account tag still credits the account.
export const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || "dexcompare-20";

// Impact (TCGplayer affiliate) site-ownership verification token — rendered as a
// <meta> in the document <head>.
export const IMPACT_SITE_VERIFICATION = "ebb0400c-dec0-45ae-a56e-e7bb1596e965";

// TCGplayer's affiliate program runs through Impact (APPROVED). Every
// tcgplayer.com outbound link is wrapped through this deep-link base to earn
// commission. `||` so an empty env var can't silently un-monetise the links.
export const TCGPLAYER_IMPACT_LINK =
  process.env.TCGPLAYER_IMPACT_LINK || "https://partner.tcgplayer.com/c/7385758/1780961/21018";

// eBay Partner Network link parameters per marketplace. mkevt=1 is the critical
// flag (without it the click is NOT tracked); mkrid is the marketplace rotation
// id. customid segments this site's earnings from the sister sites' in EPN.
const EBAY_MARKETS: Record<string, { mkrid: string; siteid: string; customid: string }> = {
  "ebay.com": { mkrid: "711-53200-19255-0", siteid: "0", customid: "tpe-us" },
  "ebay.com.au": { mkrid: "705-53470-19255-0", siteid: "15", customid: "tpe-au" },
  "ebay.co.uk": { mkrid: "710-53481-19255-0", siteid: "3", customid: "tpe-uk" },
};

function ebayMarket(hostname: string) {
  const h = hostname.replace(/^www\./i, "").toLowerCase();
  if (EBAY_MARKETS[h]) return EBAY_MARKETS[h];
  if (/(?:^|\.)ebay\./i.test(h)) return EBAY_MARKETS["ebay.com"];
  return null;
}

// Turn a plain eBay item/search URL into an affiliate-tracked one.
export function ebayAffiliateUrl(url: string): string {
  try {
    const u = new URL(url);
    const m = ebayMarket(u.hostname);
    if (!m) return url;
    u.searchParams.set("mkevt", "1");
    u.searchParams.set("mkcid", "1");
    u.searchParams.set("mkrid", m.mkrid);
    u.searchParams.set("siteid", m.siteid);
    u.searchParams.set("campid", EBAY_CAMPAIGN_ID);
    u.searchParams.set("toolid", "10001");
    u.searchParams.set("customid", m.customid);
    return u.toString();
  } catch {
    return url;
  }
}

// Affiliate-tagged eBay SEARCH link (US marketplace — the site's price baseline
// is the US market; eBay.com ships internationally).
export function ebaySearchUrl(query: string): string {
  return ebayAffiliateUrl(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`);
}

// Affiliate-tagged Amazon SEARCH link.
export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_ASSOCIATE_TAG}`;
}

// ---- Auto-affiliate network (Sovrn) for the long tail -------------------------
// eBay, Amazon and TCGplayer pay DIRECTLY (best rate), handled above. Any other
// outbound merchant link can route through Sovrn Commerce once an id is set —
// inert (plain links) until AFFILIATE_NETWORK_ID is configured.
const AFFILIATE_NETWORK = (process.env.AFFILIATE_NETWORK ?? "sovrn").toLowerCase();
const AFFILIATE_NETWORK_ID = process.env.AFFILIATE_NETWORK_ID ?? "";

// Never wrap: our own sites and the directly-monetised partners.
const NEVER_WRAP =
  /(?:^|\.)(tcgpriceempire\.com|dexcompare\.app|riftcompare\.com|ebay\.|amazon\.|tcgplayer\.com)$/i;

function networkUrl(url: string, subId: string): string | null {
  if (!AFFILIATE_NETWORK_ID) return null;
  const enc = encodeURIComponent(url);
  const xcust = encodeURIComponent(subId);
  switch (AFFILIATE_NETWORK) {
    case "sovrn":
    case "viglink":
      return `https://redirect.viglink.com/?format=go&key=${AFFILIATE_NETWORK_ID}&u=${enc}&cuid=${xcust}`;
    default:
      return null;
  }
}

// Append our affiliate identifier to an outbound product link.
//   Priority: eBay EPN → Amazon Associates → TCGplayer (Impact) → network → plain.
export function affiliateUrl(url: string | null | undefined, subId = "tcgpriceempire"): string {
  if (!url) return "#";
  try {
    const u = new URL(url);
    if (/(?:^|\.)ebay\./i.test(u.hostname)) {
      return ebayAffiliateUrl(url);
    }
    if (/(?:^|\.)amazon\./i.test(u.hostname)) {
      u.searchParams.set("tag", AMAZON_ASSOCIATE_TAG);
      return u.toString();
    }
    if (TCGPLAYER_IMPACT_LINK && /(?:^|\.)tcgplayer\.com$/i.test(u.hostname)) {
      return `${TCGPLAYER_IMPACT_LINK}?u=${encodeURIComponent(url)}`;
    }
    if ((u.protocol === "https:" || u.protocol === "http:") && !NEVER_WRAP.test(u.hostname)) {
      const net = networkUrl(url, subId);
      if (net) return net;
    }
  } catch {
    /* not an absolute URL — leave it untouched */
  }
  return url;
}
