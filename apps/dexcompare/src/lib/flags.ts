// Simple env-derived feature flags — a manual kill-switch, no external flag
// service. Follows the pattern RiftCompare uses for its own temporarily-free/
// temporarily-off features: a plain exported boolean, gated at every call site.

// The CompareEmpire Marketplace (test-mode, play-money buy/sell) on card pages.
// Off by default: play-money UI on a real price-comparison page undermines
// trust, and the free feature set (P0–P6) is meant to reach parity before any
// paywalled or demo commerce surface goes back in front of visitors. Flip to
// "true" only when the marketplace is ready to be a real, non-demo feature.
export const MARKETPLACE_ENABLED = process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED === "true";
