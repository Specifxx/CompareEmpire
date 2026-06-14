// schema.org Product is only eligible for a price snippet when it carries at
// least one of `offers`, `review`, or `aggregateRating`. We provide `offers`
// only — and we NEVER fabricate ratings or reviews (Google penalises
// self-serving review markup), which is why the GSC "missing aggregateRating /
// review" notes are deliberately left in place.
//
// This builds ONE valid AggregateOffer from a set of known item prices, or
// returns null when we hold no real price. Callers must omit `offers` entirely
// when this returns null rather than emit a degenerate `offerCount: 0` node:
// a zero/negative offerCount and a missing low/highPrice both fail Rich Results
// validation (the exact GSC warnings this replaces).
export function aggregateOffer(opts: {
  priceCentsList: Array<number | null | undefined>;
  inStock: boolean;
  currency: string;
}): Record<string, unknown> | null {
  const prices = opts.priceCentsList.filter(
    (c): c is number => typeof c === "number" && Number.isFinite(c) && c > 0,
  );
  if (prices.length === 0) return null;
  return {
    "@type": "AggregateOffer",
    priceCurrency: opts.currency,
    // low/high/offerCount all derived from the SAME price list, so the range is
    // always internally consistent (lowPrice ≤ highPrice, offerCount ≥ 1).
    lowPrice: (Math.min(...prices) / 100).toFixed(2),
    highPrice: (Math.max(...prices) / 100).toFixed(2),
    offerCount: prices.length,
    availability: opts.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    // Honest expiry: prices refresh with the daily import.
    priceValidUntil: new Date(Date.now() + 86400e3).toISOString().slice(0, 10),
  };
}
