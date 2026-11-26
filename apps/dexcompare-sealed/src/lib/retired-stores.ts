// Stores DexCompare used to read and no longer does, because the store stopped answering for weeks: shut, behind a
// password, or blocking automated reads (a 401/403/429 or challenge is never worked around). Unlike a banned store
// (blocked-stores.ts) a retired one may come back: the probe can list it again once it reads live, and then its key
// simply leaves this list. Pure (no imports).
//
// Their store pages had no listings (noindex, out of the sitemap), but the URLs existed, and a URL we published never
// 404s: /<region>/stores/<key> answers a permanent redirect to its region's store directory (StoreListing.tsx).
//
// Retired 2026-11-20 (Dex site loop), probe of that day:
// - eldartcg (EU): WooCommerce Store API answered 400, last good read 4 Nov. Back 2026-11-26: the EU sweep's probe
//   read 3+ sealed Pokémon in EUR, so it is listed again and its key left this list.
// - industria61 (EU): 403 on every path, last good read 3 Nov.
// - tradingcardgamestore (EU): Cloudflare challenge, last good read 29 Oct.
// - kumacards (UK): shop behind a password page (401), last good read 27 Oct.
// - southtexastcg (US): shop behind a password page (401), last good read 29 Oct.
// - twinfusecollectibles (US): its Pokémon collection is empty, 3 products in the whole shop, last good read 5 Nov.
// - obsessiongaming (AU): 403 on every path, last good read 27 Oct.
// - millenniumcomics (AU): 429 on every path, last good read 1 Nov.
//
// Retired 2026-11-22 (Dex site loop), probe of that day:
// - collectivecubed (US): the shop took down every sealed product (its pokemon-sealed collection 404s, each product URL
//   we had listed 404s, and its only Pokémon collections left are singles: 0 of 144 products sealed). It listed 176
//   (165 in stock) until 21 Nov. Add it back if it lists sealed again.
export const RETIRED_STORES: Readonly<Record<string, "US" | "UK" | "CA" | "AU" | "EU">> = {
  industria61: "EU",
  tradingcardgamestore: "EU",
  kumacards: "UK",
  southtexastcg: "US",
  twinfusecollectibles: "US",
  obsessiongaming: "AU",
  millenniumcomics: "AU",
  collectivecubed: "US",
};

/** Where a retired store's old page goes: its own region's store directory, or null for a key that was never retired. */
export function retiredStoreRedirect(key: string): string | null {
  const market = Object.prototype.hasOwnProperty.call(RETIRED_STORES, key) ? RETIRED_STORES[key] : undefined;
  return market ? `/${market.toLowerCase()}/stores` : null;
}
