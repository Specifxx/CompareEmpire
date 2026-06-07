// Country / market selection. Australia is the default; the United States and the
// United Kingdom are also supported. This module is PURE (no next/headers) so it's
// safe to import from both server and client components. The server-side cookie +
// geo reader lives in get-country.ts.
//
// NOTE: the database keeps a historical column name `lowestPriceCentsNz`; in
// LaptopCompare that column stores the UK (GBP) price. priceField/pickPrice map
// the GB market onto it so the rest of the app is unchanged.

export type Country = "AU" | "US" | "GB";

export interface CountryInfo {
  code: Country;
  label: string;
  adjective: string;
  place: string;
  flag: string;
  currency: string; // ISO 4217
  locale: string;
}

export const COUNTRIES: Record<Country, CountryInfo> = {
  AU: { code: "AU", label: "Australia", adjective: "Australian", place: "Australia", flag: "🇦🇺", currency: "AUD", locale: "en-AU" },
  US: { code: "US", label: "United States", adjective: "US", place: "the United States", flag: "🇺🇸", currency: "USD", locale: "en-US" },
  GB: { code: "GB", label: "United Kingdom", adjective: "UK", place: "the United Kingdom", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
};

// Order shown in the switcher.
export const COUNTRY_LIST: CountryInfo[] = [COUNTRIES.AU, COUNTRIES.US, COUNTRIES.GB];
export const DEFAULT_COUNTRY: Country = "AU";
export const COUNTRY_COOKIE = "country";

export const INTL_ENABLED = process.env.NEXT_PUBLIC_INTL_DISABLED !== "true";

const VALID = new Set<Country>(["AU", "US", "GB"]);

// Coerce any cookie/geo/query value to a supported Country (defaults to AU). Accepts
// ISO country codes from the geo header (e.g. "US", "GB"); anything else → AU.
export function normalizeCountry(v: string | undefined | null): Country {
  const up = (v ?? "").toUpperCase();
  return VALID.has(up as Country) ? (up as Country) : "AU";
}

// The Card column holding the lowest price for this market. (Nz column = UK here.)
export type PriceField = "lowestPriceCents" | "lowestPriceCentsNz" | "lowestPriceCentsUs";
export function priceField(country: Country): PriceField {
  return country === "GB" ? "lowestPriceCentsNz" : country === "US" ? "lowestPriceCentsUs" : "lowestPriceCents";
}

export function pickPrice(
  card: { lowestPriceCents: number | null; lowestPriceCentsNz?: number | null; lowestPriceCentsUs?: number | null },
  country: Country
): number | null {
  if (country === "GB") return card.lowestPriceCentsNz ?? null;
  if (country === "US") return card.lowestPriceCentsUs ?? null;
  return card.lowestPriceCents;
}

export function currencyOf(country: Country): string {
  return COUNTRIES[country].currency;
}
