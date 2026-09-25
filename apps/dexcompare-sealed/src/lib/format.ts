import { regionOfMarket } from "./regions";

/** "A$54.95", "£39.99", "€44.90" — always the market's own currency. */
export function money(cents: number | null | undefined, market: string): string {
  if (cents == null) return "—";
  const r = regionOfMarket(market);
  const currency = r?.currency ?? "USD";
  const locale = r?.locale ?? "en-US";
  const whole = cents % 100 === 0 && cents >= 10000;
  const s = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  // Disambiguate dollars: "$" alone reads as USD everywhere.
  const prefix: Record<string, string> = { AUD: "A", NZD: "NZ", CAD: "C", SGD: "S" };
  return prefix[currency] && s.startsWith("$") ? `${prefix[currency]}${s}` : s;
}

export function timeAgo(date: Date | string | null | undefined, now: number = Date.now()): string {
  if (!date) return "never";
  const ms = now - (date instanceof Date ? date.getTime() : Date.parse(date));
  const m = Math.round(ms / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
}
