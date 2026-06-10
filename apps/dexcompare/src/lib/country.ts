// Country / market selection. Australia is the global default; New Zealand, the
// United States and the United Kingdom are also supported. This module is PURE
// (no next/headers) so it's safe to import from both server and client
// components. The server-side cookie + geo reader lives in get-country.ts.

export type Country = "AU" | "NZ" | "US" | "GB";

export interface CountryInfo {
  code: Country;
  label: string; // display name, e.g. "United States" (switcher, "in {label}" only where it reads right)
  adjective: string; // attributive form, e.g. "US stores", "Australian players"
  place: string; // prepositional form with any article, e.g. "the United States" → "buy in {place}"
  flag: string; // emoji
  currency: string; // ISO 4217
  locale: string;
}

export const COUNTRIES: Record<Country, CountryInfo> = {
  AU: { code: "AU", label: "Australia", adjective: "Australian", place: "Australia", flag: "🇦🇺", currency: "AUD", locale: "en-AU" },
  NZ: { code: "NZ", label: "New Zealand", adjective: "New Zealand", place: "New Zealand", flag: "🇳🇿", currency: "NZD", locale: "en-NZ" },
  US: { code: "US", label: "United States", adjective: "US", place: "the United States", flag: "🇺🇸", currency: "USD", locale: "en-US" },
  GB: { code: "GB", label: "United Kingdom", adjective: "UK", place: "the United Kingdom", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
};

// Order shown in the switcher.
export const COUNTRY_LIST: CountryInfo[] = [COUNTRIES.AU, COUNTRIES.NZ, COUNTRIES.US, COUNTRIES.GB];
export const DEFAULT_COUNTRY: Country = "AU";
export const COUNTRY_COOKIE = "country";

// The multi-country selector is live. (Kept as a switch so it can be disabled
// quickly if a market's data needs work, without code surgery.)
export const INTL_ENABLED = process.env.NEXT_PUBLIC_INTL_DISABLED !== "true";

const VALID = new Set<Country>(["AU", "NZ", "US", "GB"]);

// Coerce any cookie/geo/query value to a supported Country (defaults to AU). Accepts
// ISO country codes from the geo header too (e.g. "US", "GB"); anything else → AU.
export function normalizeCountry(v: string | undefined | null): Country {
  const up = (v ?? "").toUpperCase();
  return VALID.has(up as Country) ? (up as Country) : "AU";
}

// The Card column holding the lowest price for this market.
export type PriceField = "lowestPriceCents" | "lowestPriceCentsNz" | "lowestPriceCentsUs" | "lowestPriceCentsGb";
export function priceField(country: Country): PriceField {
  return country === "NZ"
    ? "lowestPriceCentsNz"
    : country === "US"
    ? "lowestPriceCentsUs"
    : country === "GB"
    ? "lowestPriceCentsGb"
    : "lowestPriceCents";
}

// Pick the effective lowest price for the selected market from a card-like object.
export function pickPrice(
  card: {
    lowestPriceCents: number | null;
    lowestPriceCentsNz?: number | null;
    lowestPriceCentsUs?: number | null;
    lowestPriceCentsGb?: number | null;
  },
  country: Country
): number | null {
  if (country === "NZ") return card.lowestPriceCentsNz ?? null;
  if (country === "US") return card.lowestPriceCentsUs ?? null;
  if (country === "GB") return card.lowestPriceCentsGb ?? null;
  return card.lowestPriceCents;
}

export function currencyOf(country: Country): string {
  return COUNTRIES[country].currency;
}

// Indicative USD → local-currency conversion for the MARKET-PRICE GUIDE only
// (Card.marketPriceCents is stored in USD cents). Mirrors the rates the seeder
// uses for its baselines. Never used for real store prices — those are always
// quoted in their own market's currency by the source.
export const USD_FX: Record<Country, number> = { AU: 1.55, NZ: 1.68, US: 1.0, GB: 0.82 };

// The market-price guide (USD cents) converted for display in a market. Returns
// null when there's no guide. This is a labelled reference, NOT a buyable price —
// callers must present it as "Market guide", never as the cheapest/"from" price.
export function marketGuideCents(usdCents: number | null | undefined, country: Country): number | null {
  if (usdCents == null || usdCents <= 0) return null;
  return Math.round(usdCents * USD_FX[country]);
}
