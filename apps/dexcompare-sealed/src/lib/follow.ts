// FOLLOW A PRODUCT (owner, 2026-11-26: "let a visitor follow a sealed product and get an alert when its cheapest in-stock price
// drops below a threshold they set, or when it comes back in stock … start with US Pokémon sealed products only").
//
// A follow is ONE alert on RiftCompare's shared service (DECISIONS.md 2026-11-02): the price alert the page already offers,
// sent with `restock: true`, so the same row also emails once when the product is back after a check found it sold out
// (TCGEmpire src/lib/sister-alerts/evaluate.ts, `alsoRestock`). One email per alert, never twice inside three days; the
// service checks after each of the import's twice-daily releases. Regions outside this list keep the plain price alert.
export const FOLLOW_REGIONS: readonly string[] = ["US"];

export const followsRestock = (region: string): boolean => FOLLOW_REGIONS.includes(region);
