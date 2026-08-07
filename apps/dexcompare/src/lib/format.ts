// Currency + small formatting helpers. All money is stored as integer cents.

// Distinct symbols so every price is unambiguous about its market (a plain "$"
// could be AUD, NZD, USD or GBP). A$ = Australia, NZ$ = New Zealand,
// US$ = United States, £ = United Kingdom.
const SYMBOL: Record<string, string> = { AUD: "A$", NZD: "NZ$", USD: "US$", GBP: "£" };

// Exposed for callers that need just the symbol (e.g. labelling a raw min/max
// price filter chip) without formatting a specific cents value.
export function currencySymbol(currency: string = "AUD"): string {
  return SYMBOL[currency] ?? "$";
}

// Format integer cents in the given currency (default AUD), e.g. "A$12.50".
export function formatMoney(cents: number, currency: string = "AUD"): string {
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `${currencySymbol(currency)}${n}`;
}

export function formatAUD(cents: number): string {
  return formatMoney(cents, "AUD");
}

// Parse a user-entered dollar string (e.g. "12.50") into integer cents.
export function dollarsToCents(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

// Normalise text for search: lowercase, fold accents, strip punctuation/spaces.
// Lets "kaisa" match "Kai'Sa" and "jinxloosecannon" match "Jinx, Loose Cannon".
// The accent fold matters a lot in this catalogue specifically: Pokémon TCG has
// real accented card names (Flabébé, Nidoran's diacritic-adjacent glyphs, several
// "Pokémon"-titled sets) and almost nobody types "é" from a normal keyboard — the
// old version just dropped accented letters outright (NFD-normalize wasn't
// applied), so "Flabébé" indexed as "flabb" and a plain "flabebe" search could
// never match it by name. Same accent-fold technique as
// pokemon-species.ts:speciesSlugify, applied here for search instead of slugs.
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip the combining diacritical marks NFD split out
    .replace(/[^a-z0-9]/g, "");
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label} ago`;
  }
  return "just now";
}
