// Outbound links. eBay is affiliate-tagged (eBay Partner Network) as a plain
// SEARCH link: zero eBay API calls, no quota, no keys — the old DexCompare's
// Browse-API importer is gone for good. Store links go out untouched.
import { REGIONS, type Region } from "./regions";

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

/** An EPN-tagged eBay search for a sealed product, on the region's eBay site. */
export function ebaySearchUrl(productName: string, region: Region): string {
  const host = EBAY_FOR_REGION[region];
  const epn = EPN[host];
  const q = `Pokemon ${productName} sealed`.replace(/\s+/g, " ").trim();
  const u = new URL(`https://${host}/sch/i.html`);
  u.searchParams.set("_nkw", q);
  u.searchParams.set("LH_BIN", "1"); // Buy It Now: a price you can actually pay
  u.searchParams.set("mkevt", "1"); // required: marks the click as a tracked EPN event
  u.searchParams.set("mkcid", "1");
  u.searchParams.set("mkrid", epn.mkrid);
  u.searchParams.set("siteid", epn.siteid);
  u.searchParams.set("campid", EBAY_CAMPAIGN_ID);
  u.searchParams.set("toolid", "10001");
  u.searchParams.set("customid", `dex-${region}`);
  return u.toString();
}

export function ebayLabel(region: Region): string {
  return EBAY_FOR_REGION[region].replace(/^www\./, "");
}

/** rel for paid links (the visible disclosure is in the footer and on /about). */
export const REL_SPONSORED = "sponsored nofollow noopener noreferrer";
/** rel for plain store links: we don't vouch for them, and don't pass PageRank. */
export const REL_STORE = "nofollow noopener";

export function regionName(region: Region): string {
  return REGIONS[region].name;
}
