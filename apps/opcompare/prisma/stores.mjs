// Deep-linkable store directory. ACCURACY-FIRST: a store only ever produces a row
// when its OWN catalogue (Shopify /products.json) actually contains the card —
// matched by the unique collector code (One Piece / Yu-Gi-Oh!) or by name + set/
// number (Magic, accessories excluded). So every link lands on that exact card,
// and a store that isn't Shopify / doesn't stock the card simply produces no rows
// (it never appears — no dead links). See tcgplayer-enrich.mjs (fetchShopifyCatalog
// / indexShopifyByCode / matchShopify / matchShopifyByName). The post-seed verifier
// (scripts/verify-links.mjs) re-checks a live sample and fails on any wrong link.
//
// This is a generous CANDIDATE list across all regions; the seed keeps only the
// ones that genuinely deep-link (logged per store as "<store>: N card deep-links").
// TCGplayer is added separately in the seed for US/GB/NZ (exact product page) — it
// is NOT offered for AU (TCGplayer doesn't serve the Australian market).
export function shopifyStores() {
  return [
    // ---- Australia (AUD) ----
    { key: "guf", name: "Guf", host: "guf.com.au", country: "AU", currency: "AUD" },
    { key: "cherrycollectables", name: "Cherry Collectables", host: "cherrycollectables.com.au", country: "AU", currency: "AUD" },
    { key: "gameology", name: "Gameology", host: "www.gameology.com.au", country: "AU", currency: "AUD" },
    { key: "gapgames", name: "GAP Games", host: "www.gapgames.com.au", country: "AU", currency: "AUD" },
    { key: "goodgames", name: "Good Games", host: "goodgames.com.au", country: "AU", currency: "AUD" },
    { key: "gamesempire", name: "Games Empire", host: "gamesempire.com.au", country: "AU", currency: "AUD" },
    { key: "thegamescapital", name: "The Games Capital", host: "www.thegamescapital.com.au", country: "AU", currency: "AUD" },
    { key: "kingscomics", name: "Kings Comics", host: "www.kingscomics.com", country: "AU", currency: "AUD" },
    { key: "bantertoys", name: "Banter Toys", host: "bantertoys.com.au", country: "AU", currency: "AUD" },
    { key: "sanctuarygaming", name: "Sanctuary Gaming", host: "sanctuarygamingstore.com.au", country: "AU", currency: "AUD" },
    { key: "eternalgames", name: "Eternal Games", host: "eternalgames.com.au", country: "AU", currency: "AUD" },
    { key: "nextlevelgames", name: "Next Level Games", host: "nextlevelgames.com.au", country: "AU", currency: "AUD" },
    { key: "hobbymaster", name: "Hobbymaster", host: "hobbymaster.com.au", country: "AU", currency: "AUD" },
    { key: "kapowcomics", name: "Kapow Comics", host: "kapowcomics.com.au", country: "AU", currency: "AUD" },
    { key: "gameskeeper", name: "The Gamekeeper", host: "gameskeeper.com.au", country: "AU", currency: "AUD" },
    { key: "goblinsden_au", name: "Goblins Den", host: "goblinsden.com.au", country: "AU", currency: "AUD" },
    { key: "mindgames_au", name: "Mind Games", host: "www.mindgames.com.au", country: "AU", currency: "AUD" },
    // ---- United Kingdom (GBP) ----
    { key: "totalcards", name: "Total Cards", host: "www.totalcards.net", country: "GB", currency: "GBP" },
    { key: "goblingaming", name: "Goblin Gaming", host: "www.goblingaming.co.uk", country: "GB", currency: "GBP" },
    { key: "axionnow", name: "Axion Now", host: "www.axionnow.com", country: "GB", currency: "GBP" },
    { key: "hairyt", name: "Hairy T", host: "www.hairyt.com", country: "GB", currency: "GBP" },
    { key: "cardempire", name: "Card Empire", host: "www.cardempire.co.uk", country: "GB", currency: "GBP" },
    { key: "travellingman", name: "Travelling Man", host: "travellingman.com", country: "GB", currency: "GBP" },
    { key: "spellboundgames", name: "Spellbound Games", host: "www.spellboundgames.co.uk", country: "GB", currency: "GBP" },
    { key: "fanboythree", name: "Fan Boy Three", host: "fanboythree.co.uk", country: "GB", currency: "GBP" },
    { key: "hiddenhoard", name: "The Hidden Hoard", host: "www.thehiddenhoard.co.uk", country: "GB", currency: "GBP" },
    { key: "geekvillage", name: "Geek Village", host: "www.geekvillage.co.uk", country: "GB", currency: "GBP" },
    { key: "mtgmate_uk", name: "MTG Mate", host: "www.mtgmate.co.uk", country: "GB", currency: "GBP" },
    { key: "gamesden_uk", name: "Games Den", host: "www.gamesden.co.uk", country: "GB", currency: "GBP" },
    { key: "battlequest_uk", name: "Battle Quest", host: "battlequestcards.com", country: "GB", currency: "GBP" },
    // ---- New Zealand (NZD) ----
    { key: "cardmerchant", name: "Card Merchant NZ", host: "www.cardmerchant.co.nz", country: "NZ", currency: "NZD" },
    { key: "goblingames_nz", name: "Goblin Games NZ", host: "goblingames.co.nz", country: "NZ", currency: "NZD" },
    { key: "gamekings_nz", name: "Game Kings", host: "www.gamekings.co.nz", country: "NZ", currency: "NZD" },
    { key: "vault_nz", name: "The Vault", host: "thevault.co.nz", country: "NZ", currency: "NZD" },
    { key: "boardgames_nz", name: "Board Games NZ", host: "www.boardgames.co.nz", country: "NZ", currency: "NZD" },
    { key: "cerberusgames_nz", name: "Cerberus Games", host: "cerberusgames.co.nz", country: "NZ", currency: "NZD" },
    { key: "shieldgames_nz", name: "Shield Games", host: "shieldgames.co.nz", country: "NZ", currency: "NZD" },
    // ---- United States (USD) ----
    { key: "cardcavern_us", name: "Card Cavern", host: "cardcavern.com", country: "US", currency: "USD" },
    { key: "capefeargames", name: "Cape Fear Games", host: "www.capefeargames.com", country: "US", currency: "USD" },
    { key: "channelfireball", name: "ChannelFireball", host: "store.channelfireball.com", country: "US", currency: "USD" },
    { key: "frontlinegaming", name: "Frontline Gaming", host: "frontlinegaming.org", country: "US", currency: "USD" },
    { key: "gamegoblin_us", name: "The Game Goblin", host: "www.thegamegoblin.com", country: "US", currency: "USD" },
  ];
}
