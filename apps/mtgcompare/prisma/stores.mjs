// Shared retailer directory — CURATED to REAL, reachable stores that sell across
// Magic / One Piece / Yu-Gi-Oh! (one directory serves all three sites). Every
// domain + search path is HTTP-verified via the persona-click audit workflow
// (scripts/audit-tcg.mjs); dead/fake domains and broken search paths are culled.
// `tcg` is the TCGplayer category slug (magic | one-piece-card-game | yugioh).
// Outbound links go to each store's search so the affiliate layer (TCGplayer
// Impact, Amazon, Sovrn) monetises the click. (eBay is handled separately as an
// affiliate-search CTA — no Browse API.)
//
// SEARCH QUERY: we pass the card NAME ONLY (see storeQuery below). Over-qualifying
// with the set name ("Monkey D. Luffy Romance Dawn") returns "no results" on most
// store search engines; the bare name reliably lands the shopper on the card. The
// US TCGplayer row is upgraded at seed time to the card's REAL product-page URL
// where we can match it (exact card, like dexcompare).
export function buildStores(tcg) {
  return {
    US: [
      { key: "tcgplayer_us", name: "TCGplayer", search: (q) => `https://www.tcgplayer.com/search/${tcg}/product?q=${q}` },
      { key: "cardkingdom", name: "Card Kingdom", search: (q) => `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${q}` },
      { key: "starcitygames", name: "Star City Games", search: (q) => `https://starcitygames.com/search/?search_query=${q}` },
      { key: "channelfireball", name: "ChannelFireball", search: (q) => `https://store.channelfireball.com/search?q=${q}` },
      { key: "coolstuffinc", name: "CoolStuffInc", search: (q) => `https://www.coolstuffinc.com/main_search.php?q=${q}` },
      { key: "abugames", name: "ABU Games", search: (q) => `https://abugames.com/search?q=${q}` },
      { key: "dacardworld", name: "Da Card World", search: (q) => `https://www.dacardworld.com/search?q=${q}` },
      { key: "mtgseattle", name: "MTG Seattle", search: (q) => `https://www.mtgseattle.com/products/search?q=${q}` },
      { key: "gamenerdz", name: "GameNerdz", search: (q) => `https://www.gamenerdz.com/search.php?search_query=${q}` },
      { key: "hareruya_us", name: "Hareruya", search: (q) => `https://www.hareruyamtg.com/en/products/search?word=${q}` },
      { key: "cardcavern", name: "Card Cavern", search: (q) => `https://cardcavern.com/search?q=${q}` },
      { key: "fourohone", name: "401 Games", search: (q) => `https://store.401games.ca/search?q=${q}` },
      { key: "amazon_us", name: "Amazon", search: (q) => `https://www.amazon.com/s?k=${q}+trading+card` },
    ],
    AU: [
      { key: "guf", name: "Guf", search: (q) => `https://guf.com.au/search?q=${q}` },
      { key: "cherrycollectables", name: "Cherry Collectables", search: (q) => `https://cherrycollectables.com.au/search?q=${q}` },
      { key: "gameforce", name: "GameForce", search: (q) => `https://gameforce.com.au/search?q=${q}` },
      { key: "thegamescapital", name: "The Games Capital", search: (q) => `https://www.thegamescapital.com.au/search?q=${q}` },
      { key: "kingscomics", name: "Kings Comics", search: (q) => `https://www.kingscomics.com/search?q=${q}` },
      { key: "gameology", name: "Gameology", search: (q) => `https://www.gameology.com.au/search?q=${q}` },
      { key: "gamesempire", name: "Games Empire", search: (q) => `https://gamesempire.com.au/search?q=${q}` },
      { key: "goodgames", name: "Good Games", search: (q) => `https://goodgames.com.au/search?q=${q}` },
      // candidates (re-verified by the audit)
      { key: "gapgames_au", name: "GAP Games", search: (q) => `https://www.gapgames.com.au/search?q=${q}` },
      { key: "houseofcards_au", name: "House of Cards", search: (q) => `https://houseofcards.com.au/search?q=${q}` },
      { key: "birdkeeper_au", name: "Bird Keeper", search: (q) => `https://birdkeeper.com.au/search?q=${q}` },
      { key: "mightyape_au", name: "Mighty Ape", search: (q) => `https://www.mightyape.com.au/search?q=${q}` },
    ],
    GB: [
      { key: "totalcards", name: "Total Cards", search: (q) => `https://www.totalcards.net/catalogsearch/result/?q=${q}` },
      { key: "elementgames", name: "Element Games", search: (q) => `https://elementgames.co.uk/search?q=${q}` },
      { key: "darksphere", name: "Dark Sphere", search: (q) => `https://www.darksphere.co.uk/index.php?main_page=advanced_search_result&keyword=${q}` },
      { key: "goblingaming", name: "Goblin Gaming", search: (q) => `https://www.goblingaming.co.uk/search?q=${q}` },
      { key: "axionnow", name: "Axion Now", search: (q) => `https://www.axionnow.com/search?q=${q}` },
      { key: "hairyt", name: "Hairy T", search: (q) => `https://www.hairyt.com/search?q=${q}` },
      { key: "cardempire", name: "Card Empire", search: (q) => `https://www.cardempire.co.uk/search?q=${q}` },
      { key: "travellingman", name: "Travelling Man", search: (q) => `https://travellingman.com/search?q=${q}` },
      { key: "hareruya_uk", name: "Hareruya", search: (q) => `https://www.hareruyamtg.com/en/products/search?word=${q}` },
      { key: "chaoscards", name: "Chaos Cards", search: (q) => `https://www.chaoscards.co.uk/search?q=${q}` },
      { key: "magicmadhouse", name: "Magic Madhouse", search: (q) => `https://www.magicmadhouse.co.uk/search?q=${q}` },
      { key: "patriotgames_uk", name: "Patriot Games", search: (q) => `https://www.patriotgames.co.uk/search?q=${q}` },
      // candidates (re-verified by the audit)
      { key: "manaleak", name: "Manaleak", search: (q) => `https://www.manaleak.com/search?q=${q}` },
      { key: "bigorbitcards", name: "Big Orbit Cards", search: (q) => `https://bigorbitcards.co.uk/search?q=${q}` },
      { key: "waylandgames", name: "Wayland Games", search: (q) => `https://www.waylandgames.co.uk/search?q=${q}` },
      { key: "magicstronghold", name: "Magic Stronghold", search: (q) => `https://www.magicstronghold.com/search?q=${q}` },
      // candidates (re-verified by the audit)
      { key: "spellboundgames", name: "Spellbound Games", search: (q) => `https://www.spellboundgames.co.uk/search?q=${q}` },
      { key: "amazon_uk", name: "Amazon", search: (q) => `https://www.amazon.co.uk/s?k=${q}+trading+card` },
    ],
    NZ: [
      { key: "cardmerchant", name: "Card Merchant NZ", search: (q) => `https://www.cardmerchant.co.nz/search?q=${q}` },
      { key: "boardgamesnz", name: "Board Games NZ", search: (q) => `https://www.boardgames.co.nz/search?q=${q}` },
      { key: "gamekings_nz", name: "Game Kings", search: (q) => `https://www.gamekings.co.nz/search?q=${q}` },
      { key: "vault_nz", name: "The Vault", search: (q) => `https://thevault.co.nz/search?q=${q}` },
      { key: "mightyape_nz", name: "Mighty Ape", search: (q) => `https://www.mightyape.co.nz/search?q=${q}` },
      // candidates (re-verified by the audit)
      { key: "goblingames_nz", name: "Goblin Games NZ", search: (q) => `https://goblingames.co.nz/search?q=${q}` },
      { key: "amazon_nz", name: "Amazon", search: (q) => `https://www.amazon.com.au/s?k=${q}+trading+card` },
    ],
  };
}

// Store search query for a card. NAME ONLY — see the header note: the bare card
// name reliably returns the card on store search engines, whereas name+set
// usually returns nothing.
export function storeQuery(card) {
  return String(card.name || "").trim();
}

// "Main" stores per market (subset, used when a market needs fewer rows — e.g.
// YGO, to fit the Neon free tier). Order = priority. Keys must exist above.
const MAIN = {
  US: ["tcgplayer_us", "amazon_us", "cardkingdom", "starcitygames", "channelfireball", "coolstuffinc", "cardcavern", "abugames", "dacardworld", "gamenerdz"],
  AU: ["mightyape_au", "guf", "cherrycollectables", "gameforce", "goodgames", "thegamescapital", "kingscomics", "gameology", "gamesempire", "gapgames_au"],
  GB: ["amazon_uk", "totalcards", "elementgames", "chaoscards", "goblingaming", "magicmadhouse", "darksphere", "axionnow", "hairyt", "cardempire"],
  NZ: ["cardmerchant", "boardgamesnz", "gamekings_nz", "vault_nz", "mightyape_nz"],
};
export function topStores(tcg, n = 10) {
  const full = buildStores(tcg);
  const out = {};
  for (const r of Object.keys(full)) {
    out[r] = MAIN[r].map((k) => full[r].find((s) => s.key === k)).filter(Boolean).slice(0, n);
  }
  return out;
}
