// PAID FEATURED LISTINGS (owner, 2026-11-09: "a featured listing on dexcompare ... people pay for a direct spot on the website via
// Stripe, $100 per featured listing per week"). DECISIONS.md, "Paid featured listings". This site stores nothing: the form posts to
// RiftCompare's shared service (like the price alerts), which takes the card through Stripe Checkout, holds the order until the owner
// approves it and publishes the live ads at /api/sister-ads/dex. The banner reads that feed in the browser, so no release is needed
// to start or end an ad.
export const ADS_SITE_KEY = "dex";
export const ADS_SERVICE = "https://riftcompare.com/api/sister-ads";
export const ADS_FEED = `${ADS_SERVICE}/${ADS_SITE_KEY}`;
export const ADS_PRIVACY = "https://riftcompare.com/privacy#sister-ads";
export const WEEK_PRICE_USD = 100;
export const MAX_WEEKS = 4;
export const AD_REGIONS: [string, string][] = [
  ["ALL", "Everywhere"],
  ["US", "United States"],
  ["AU", "Australia"],
  ["UK", "United Kingdom"],
  ["CA", "Canada"],
  ["NZ", "New Zealand"],
  ["EU", "Europe"],
  ["SG", "Singapore"],
];

export interface FeaturedAd {
  id: string;
  title: string;
  blurb: string | null;
  url: string;
  image: string;
  price: string | null;
  region: string;
  startsAt: string;
  endsAt: string;
}

/** The ads to draw now for a visitor in `region` ("AU"): inside their dates, for that region or everywhere, at most `max`. */
export function adsToShow(ads: unknown, region: string, now: number, max = 3): FeaturedAd[] {
  if (!Array.isArray(ads)) return [];
  const out: FeaturedAd[] = [];
  for (const a of ads as Partial<FeaturedAd>[]) {
    if (!a || typeof a.title !== "string" || typeof a.url !== "string" || typeof a.image !== "string" || typeof a.id !== "string") continue;
    if (!/^https:\/\//.test(a.url) || !/^https:\/\//.test(a.image)) continue;
    const start = Date.parse(String(a.startsAt));
    const end = Date.parse(String(a.endsAt));
    if (!(start <= now && now < end)) continue;
    if (a.region !== "ALL" && a.region !== region) continue;
    out.push(a as FeaturedAd);
    if (out.length >= max) break;
  }
  return out;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
