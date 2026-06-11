// Region / market selection. The data baseline is the US market (TCGplayer USD
// + Cardmarket EUR), so the region doesn't change the source prices — it
// localises everything around them: which eBay/Amazon marketplace links point
// at, the indicative local-currency conversion shown next to USD prices, and
// the copy. This module is PURE (no next/headers) so it's safe in both server
// and client components; the cookie/geo reader lives in get-country.ts.

export type Country = "US" | "AU" | "NZ" | "GB";

export interface CountryInfo {
  code: Country;
  label: string; // display name
  adjective: string; // "US stores", "Australian collectors"
  place: string; // "the United States" → "buy in {place}"
  flag: string;
  currency: string; // local display currency (ISO 4217)
  locale: string;
}

export const COUNTRIES: Record<Country, CountryInfo> = {
  US: { code: "US", label: "United States", adjective: "US", place: "the United States", flag: "🇺🇸", currency: "USD", locale: "en-US" },
  AU: { code: "AU", label: "Australia", adjective: "Australian", place: "Australia", flag: "🇦🇺", currency: "AUD", locale: "en-AU" },
  NZ: { code: "NZ", label: "New Zealand", adjective: "New Zealand", place: "New Zealand", flag: "🇳🇿", currency: "NZD", locale: "en-NZ" },
  GB: { code: "GB", label: "United Kingdom", adjective: "UK", place: "the United Kingdom", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
};

// Order shown in the switcher (US first — it's the data baseline).
export const COUNTRY_LIST: CountryInfo[] = [COUNTRIES.US, COUNTRIES.AU, COUNTRIES.NZ, COUNTRIES.GB];
export const DEFAULT_COUNTRY: Country = "US";
export const COUNTRY_COOKIE = "country";

const VALID = new Set<Country>(["US", "AU", "NZ", "GB"]);

export function normalizeCountry(v: string | undefined | null): Country {
  const up = (v ?? "").toUpperCase();
  return VALID.has(up as Country) ? (up as Country) : DEFAULT_COUNTRY;
}

// Indicative USD → local-currency conversion, ONLY ever displayed with a "≈"
// and labelled indicative (mirrors dexcompare's market-guide conversion). Never
// replaces a real price — eBay/store links always show the vendor's own price.
export const USD_FX: Record<Country, number> = { US: 1.0, AU: 1.55, NZ: 1.68, GB: 0.82 };

export function localApproxCents(usdCents: number | null | undefined, country: Country): number | null {
  if (usdCents == null || country === "US") return null; // US shows USD directly
  return Math.round(usdCents * USD_FX[country]);
}
