// Deep-linkable store directory. ACCURACY-FIRST: a store only belongs here if we
// can resolve a link to the SPECIFIC card. Two mechanisms produce such links:
//   • TCGplayer  — every card has a real product id → exact product page (handled
//     in the seed via the catalogue's productUrl). Works for all games.
//   • Shopify card stores — their /products.json is their real catalogue; we match
//     each card by its UNIQUE collector code (One Piece / Yu-Gi-Oh!) and link to the
//     real product page with the store's real price + stock (see tcgplayer-enrich
//     .mjs: fetchShopifyCatalog / indexShopifyByCode / matchShopify). Code matching
//     is exact, so the link always lands on that one card.
//
// Stores that only expose a generic search (no stable per-card link), aren't TCG
// retailers, or have no /products.json were REMOVED — a search/homepage/404 is
// worthless here. Magic titles don't carry a reliable per-card code on Shopify
// (they collide with accessories like "… Art Sleeves Plains"), so Magic uses
// TCGplayer only; One Piece / Yu-Gi-Oh! get the Shopify stores below as well.
//
// Each store's per-card row is created ONLY when its catalogue actually contains
// that card (code match) — a store that doesn't stock a card simply doesn't appear,
// so there are no dead links. The post-seed verifier (scripts/verify-links.mjs)
// re-checks a sample and fails the build if any link doesn't resolve to the card.
export function shopifyStores() {
  return [
    // Australia (AUD)
    { key: "guf", name: "Guf", host: "guf.com.au", country: "AU", currency: "AUD" },
    { key: "cherrycollectables", name: "Cherry Collectables", host: "cherrycollectables.com.au", country: "AU", currency: "AUD" },
    { key: "thegamescapital", name: "The Games Capital", host: "www.thegamescapital.com.au", country: "AU", currency: "AUD" },
    { key: "kingscomics", name: "Kings Comics", host: "www.kingscomics.com", country: "AU", currency: "AUD" },
    { key: "gameology", name: "Gameology", host: "www.gameology.com.au", country: "AU", currency: "AUD" },
    { key: "gamesempire", name: "Games Empire", host: "gamesempire.com.au", country: "AU", currency: "AUD" },
    { key: "goodgames", name: "Good Games", host: "goodgames.com.au", country: "AU", currency: "AUD" },
    { key: "gapgames", name: "GAP Games", host: "www.gapgames.com.au", country: "AU", currency: "AUD" },
    // United Kingdom (GBP)
    { key: "totalcards", name: "Total Cards", host: "www.totalcards.net", country: "GB", currency: "GBP" },
    { key: "goblingaming", name: "Goblin Gaming", host: "www.goblingaming.co.uk", country: "GB", currency: "GBP" },
    { key: "axionnow", name: "Axion Now", host: "www.axionnow.com", country: "GB", currency: "GBP" },
    { key: "hairyt", name: "Hairy T", host: "www.hairyt.com", country: "GB", currency: "GBP" },
    { key: "cardempire", name: "Card Empire", host: "www.cardempire.co.uk", country: "GB", currency: "GBP" },
    { key: "travellingman", name: "Travelling Man", host: "travellingman.com", country: "GB", currency: "GBP" },
    { key: "spellboundgames", name: "Spellbound Games", host: "www.spellboundgames.co.uk", country: "GB", currency: "GBP" },
    // New Zealand (NZD)
    { key: "cardmerchant", name: "Card Merchant NZ", host: "www.cardmerchant.co.nz", country: "NZ", currency: "NZD" },
    { key: "goblingames_nz", name: "Goblin Games NZ", host: "goblingames.co.nz", country: "NZ", currency: "NZD" },
  ];
}
