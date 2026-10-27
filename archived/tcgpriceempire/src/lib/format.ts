// Currency + small formatting helpers. All money is stored as integer cents in
// the VENDOR'S OWN currency (USD for TCGplayer/eBay/Amazon/CoolStuffInc, EUR for
// Cardmarket) — we display native prices, never silently convert.

const SYMBOL: Record<string, string> = { USD: "US$", EUR: "€", AUD: "A$", GBP: "£" };

export function formatMoney(cents: number, currency: string = "USD"): string {
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `${SYMBOL[currency] ?? "$"}${n}`;
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
