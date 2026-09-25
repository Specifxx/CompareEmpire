// The markets DexCompare compares within. A market is a region whose stores
// all charge in ONE currency, so "cheapest" is always a like-for-like number a
// buyer there is actually offered. Pure module: safe in client components.
//
// EU is the eurozone as one market (one currency, one customs union), not a
// country. The other codes are ISO 3166 except UK (ISO: GB).

export type Region = "au" | "nz" | "us" | "uk" | "ca" | "eu" | "sg";
export type Market = Uppercase<Region>;

export interface RegionInfo {
  region: Region;
  market: Market;
  name: string; // "Australia"
  short: string; // "AU"
  adjective: string; // "Australian"
  flag: string;
  currency: string; // ISO 4217
  locale: string; // for number formatting
  // Shopify Markets `?country=` value that asks a store for its price in this
  // market. null = don't send one (EU stores price in EUR by default).
  shopifyCountry: string | null;
  // eBay site for the affiliate "see listings on eBay" link (no API calls).
  ebayHost: string | null;
  // hreflang for alternates between regional copies of the same page.
  hreflang: string;
}

export const REGIONS: Record<Region, RegionInfo> = {
  au: { region: "au", market: "AU", name: "Australia", short: "AU", adjective: "Australian", flag: "🇦🇺", currency: "AUD", locale: "en-AU", shopifyCountry: "AU", ebayHost: "www.ebay.com.au", hreflang: "en-AU" },
  nz: { region: "nz", market: "NZ", name: "New Zealand", short: "NZ", adjective: "New Zealand", flag: "🇳🇿", currency: "NZD", locale: "en-NZ", shopifyCountry: "NZ", ebayHost: "www.ebay.com.au", hreflang: "en-NZ" },
  us: { region: "us", market: "US", name: "United States", short: "US", adjective: "US", flag: "🇺🇸", currency: "USD", locale: "en-US", shopifyCountry: "US", ebayHost: "www.ebay.com", hreflang: "en-US" },
  uk: { region: "uk", market: "UK", name: "United Kingdom", short: "UK", adjective: "UK", flag: "🇬🇧", currency: "GBP", locale: "en-GB", shopifyCountry: "GB", ebayHost: "www.ebay.co.uk", hreflang: "en-GB" },
  ca: { region: "ca", market: "CA", name: "Canada", short: "CA", adjective: "Canadian", flag: "🇨🇦", currency: "CAD", locale: "en-CA", shopifyCountry: "CA", ebayHost: "www.ebay.ca", hreflang: "en-CA" },
  eu: { region: "eu", market: "EU", name: "Europe (eurozone)", short: "EU", adjective: "European", flag: "🇪🇺", currency: "EUR", locale: "en-IE", shopifyCountry: null, ebayHost: "www.ebay.de", hreflang: "en-IE" },
  sg: { region: "sg", market: "SG", name: "Singapore", short: "SG", adjective: "Singapore", flag: "🇸🇬", currency: "SGD", locale: "en-SG", shopifyCountry: "SG", ebayHost: "www.ebay.com.sg", hreflang: "en-SG" },
};

export const REGION_LIST: RegionInfo[] = ["au", "us", "uk", "ca", "nz", "eu", "sg"].map((r) => REGIONS[r as Region]);

export function isRegion(v: string | null | undefined): v is Region {
  return !!v && Object.prototype.hasOwnProperty.call(REGIONS, v);
}

export function regionOfMarket(market: string): RegionInfo | null {
  const r = market.toLowerCase();
  return isRegion(r) ? REGIONS[r] : null;
}

export function currencyOfMarket(market: string): string | null {
  return regionOfMarket(market)?.currency ?? null;
}

/**
 * Guess a visitor's region from their browser time zone. Used only to SUGGEST a
 * region on the landing page; nothing redirects on it.
 */
export function regionFromTimeZone(tz: string | undefined | null): Region | null {
  if (!tz) return null;
  if (/^Australia\//.test(tz)) return "au";
  if (/^Pacific\/(Auckland|Chatham)$/.test(tz)) return "nz";
  if (/^Europe\/London$|^Europe\/Belfast$/.test(tz)) return "uk";
  if (/^Asia\/Singapore$/.test(tz)) return "sg";
  if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife)$/.test(tz)) return "ca";
  if (/^America\//.test(tz) || /^US\//.test(tz) || tz === "Pacific/Honolulu") return "us";
  if (/^Europe\//.test(tz)) return "eu";
  return null;
}
