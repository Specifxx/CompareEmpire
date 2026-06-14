// Shared retailer directory: 20+ real card stores per market. `tcg` is the
// TCGplayer category slug for the site (magic | one-piece-card-game | yugioh).
// Outbound links go to each store's search so the affiliate layer (eBay EPN,
// TCGplayer Impact, Amazon tag, Sovrn for the rest) monetises every click.
export function buildStores(tcg) {
  const enc = (q) => encodeURIComponent(q);
  return {
    US: [
      { key: "tcgplayer_us", name: "TCGplayer", search: (q) => `https://www.tcgplayer.com/search/${tcg}/product?q=${q}` },
      { key: "cardkingdom", name: "Card Kingdom", search: (q) => `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${q}` },
      { key: "starcitygames", name: "Star City Games", search: (q) => `https://starcitygames.com/search/?search_query=${q}` },
      { key: "channelfireball", name: "ChannelFireball", search: (q) => `https://store.channelfireball.com/search?q=${q}` },
      { key: "coolstuffinc", name: "CoolStuffInc", search: (q) => `https://www.coolstuffinc.com/main_search.php?q=${q}` },
      { key: "trollandtoad", name: "Troll and Toad", search: (q) => `https://www.trollandtoad.com/category.php?search-words=${q}` },
      { key: "abugames", name: "ABU Games", search: (q) => `https://abugames.com/search?q=${q}` },
      { key: "dacardworld", name: "Da Card World", search: (q) => `https://www.dacardworld.com/search?q=${q}` },
      { key: "miniaturemarket", name: "Miniature Market", search: (q) => `https://www.miniaturemarket.com/catalogsearch/result/?q=${q}` },
      { key: "capefeargames", name: "Cape Fear Games", search: (q) => `https://www.capefeargames.com/search?q=${q}` },
      { key: "hareruya_us", name: "Hareruya", search: (q) => `https://www.hareruyamtg.com/en/products/search?word=${q}` },
      { key: "collectorscache", name: "Collector's Cache", search: (q) => `https://collectorscache.com/search?q=${q}` },
      { key: "cardconduit", name: "Card Conduit", search: (q) => `https://cardconduit.com/buy?q=${q}` },
      { key: "mtgseattle", name: "MTG Seattle", search: (q) => `https://www.mtgseattle.com/products/search?q=${q}` },
      { key: "gamenerdz", name: "GameNerdz", search: (q) => `https://www.gamenerdz.com/search.php?search_query=${q}` },
      { key: "tcgrepublic", name: "TCG Republic", search: (q) => `https://www.tcg-republic.com/product-list?keyword=${q}` },
      { key: "amazon_us", name: "Amazon", search: (q) => `https://www.amazon.com/s?k=${q}` },
      { key: "cardtrader_us", name: "CardTrader", search: (q) => `https://www.cardtrader.com/en/cards?q=${q}` },
      { key: "novamastertcg", name: "Nova Master TCG", search: (q) => `https://novamastertcg.com/search?q=${q}` },
      { key: "ebay_us", name: "eBay", search: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    ],
    AU: [
      { key: "goodgames", name: "Good Games", search: (q) => `https://goodgames.com.au/catalogsearch/result/?q=${q}` },
      { key: "guf", name: "Guf", search: (q) => `https://guf.com.au/search?q=${q}` },
      { key: "cardmania", name: "Card Mania", search: (q) => `https://cardmania.com.au/search?q=${q}` },
      { key: "gauntletgames", name: "Gauntlet Games", search: (q) => `https://www.gauntletgamesaustralia.com.au/search?q=${q}` },
      { key: "cherrycollectables", name: "Cherry Collectables", search: (q) => `https://cherrycollectables.com.au/search?q=${q}` },
      { key: "kingdomofgeek", name: "Kingdom of Geek", search: (q) => `https://kingdomofgeek.com.au/search?q=${q}` },
      { key: "gameforce", name: "GameForce", search: (q) => `https://gameforce.com.au/search?q=${q}` },
      { key: "thegamescapital", name: "The Games Capital", search: (q) => `https://www.thegamescapital.com.au/search?q=${q}` },
      { key: "nextlevelgames", name: "Next Level Games", search: (q) => `https://nextlevelgames.com.au/search?q=${q}` },
      { key: "mindgames", name: "Mind Games", search: (q) => `https://www.mindgames.com.au/search?q=${q}` },
      { key: "kingscomics", name: "Kings Comics", search: (q) => `https://www.kingscomics.com/search?q=${q}` },
      { key: "gameology", name: "Gameology", search: (q) => `https://www.gameology.com.au/search?q=${q}` },
      { key: "timelesscollectables", name: "Timeless Collectables", search: (q) => `https://timelesscollectables.com.au/search?q=${q}` },
      { key: "epictcg", name: "Epic TCG", search: (q) => `https://epictcg.com.au/search?q=${q}` },
      { key: "gamesempire", name: "Games Empire", search: (q) => `https://gamesempire.com.au/search?q=${q}` },
      { key: "thehobbyhut", name: "The Hobby Hut", search: (q) => `https://thehobbyhut.com.au/search?q=${q}` },
      { key: "goodgrieftcg", name: "Good Grief TCG", search: (q) => `https://goodgrieftcg.com.au/search?q=${q}` },
      { key: "shieldsupgames", name: "Shields Up Games", search: (q) => `https://shieldsupgames.com.au/search?q=${q}` },
      { key: "mightyape_au", name: "Mighty Ape", search: (q) => `https://www.mightyape.com.au/search?q=${q}` },
      { key: "ebay", name: "eBay", search: (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}` },
    ],
    GB: [
      { key: "magicmadhouse", name: "Magic Madhouse", search: (q) => `https://www.magicmadhouse.co.uk/catalogsearch/result/?q=${q}` },
      { key: "chaoscards", name: "Chaos Cards", search: (q) => `https://www.chaoscards.co.uk/catalogsearch/result/?q=${q}` },
      { key: "totalcards", name: "Total Cards", search: (q) => `https://www.totalcards.net/catalogsearch/result/?q=${q}` },
      { key: "manaleak", name: "Manaleak", search: (q) => `https://www.manaleak.com/mtg-singles?q=${q}` },
      { key: "elementgames", name: "Element Games", search: (q) => `https://elementgames.co.uk/search?q=${q}` },
      { key: "bigorbitcards", name: "Big Orbit Cards", search: (q) => `https://bigorbitcards.co.uk/search?q=${q}` },
      { key: "patriotgames", name: "Patriot Games", search: (q) => `https://www.patriotgamesstirling.com/search?q=${q}` },
      { key: "darksphere", name: "Dark Sphere", search: (q) => `https://www.darksphere.co.uk/index.php?main_page=advanced_search_result&keyword=${q}` },
      { key: "goblingaming", name: "Goblin Gaming", search: (q) => `https://www.goblingaming.co.uk/search?q=${q}` },
      { key: "axionnow", name: "Axion Now", search: (q) => `https://www.axionnow.com/search?q=${q}` },
      { key: "hairyt", name: "Hairy T", search: (q) => `https://www.hairyt.com/search?q=${q}` },
      { key: "cardempire", name: "Card Empire", search: (q) => `https://www.cardempire.co.uk/search?q=${q}` },
      { key: "travellingman", name: "Travelling Man", search: (q) => `https://travellingman.com/search?q=${q}` },
      { key: "ultimacenter", name: "Ultima Center", search: (q) => `https://ultimacenter.com/search?q=${q}` },
      { key: "fantasycoast", name: "Fantasy Coast", search: (q) => `https://fantasycoast.co.uk/search?q=${q}` },
      { key: "magicstronghold", name: "Magic Stronghold", search: (q) => `https://www.magicstronghold.co.uk/search?q=${q}` },
      { key: "tabletoptycoon", name: "Tabletop Tycoon", search: (q) => `https://tabletoptycoon.co.uk/search?q=${q}` },
      { key: "hareruya_uk", name: "Hareruya", search: (q) => `https://www.hareruyamtg.com/en/products/search?word=${q}` },
      { key: "amazon_uk", name: "Amazon", search: (q) => `https://www.amazon.co.uk/s?k=${q}` },
      { key: "ebay_uk", name: "eBay", search: (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}` },
    ],
    NZ: [
      { key: "cardmerchant", name: "Card Merchant NZ", search: (q) => `https://www.cardmerchant.co.nz/search?q=${q}` },
      { key: "mightyape_nz", name: "Mighty Ape", search: (q) => `https://www.mightyape.co.nz/search?q=${q}` },
      { key: "vault_nz", name: "Vault TCG", search: (q) => `https://www.vaulttcg.co.nz/search?q=${q}` },
      { key: "cerberusgames", name: "Cerberus Games", search: (q) => `https://cerberusgames.co.nz/search?q=${q}` },
      { key: "comicscompulsion", name: "Comics Compulsion", search: (q) => `https://www.comicscompulsion.co.nz/search?q=${q}` },
      { key: "geekzone_nz", name: "Geek Out NZ", search: (q) => `https://geekout.co.nz/search?q=${q}` },
      { key: "thegamesshop_nz", name: "The Games Shop", search: (q) => `https://thegamesshop.co.nz/search?q=${q}` },
      { key: "markone", name: "Mark One Comics", search: (q) => `https://www.markonecomics.co.nz/search?q=${q}` },
      { key: "conqueringgames", name: "Conquering Games", search: (q) => `https://conqueringgames.co.nz/search?q=${q}` },
      { key: "tcghub_nz", name: "TCG Hub NZ", search: (q) => `https://tcghub.co.nz/search?q=${q}` },
      { key: "gamekards", name: "Game Kards", search: (q) => `https://gamekards.co.nz/search?q=${q}` },
      { key: "alttcg", name: "Alternate TCG", search: (q) => `https://alternatetcg.co.nz/search?q=${q}` },
      { key: "mtgnz", name: "MTG NZ", search: (q) => `https://mtgnz.co.nz/search?q=${q}` },
      { key: "tcgmart_nz", name: "TCG Mart", search: (q) => `https://tcgmart.co.nz/search?q=${q}` },
      { key: "boardgamesnz", name: "Board Games NZ", search: (q) => `https://www.boardgames.co.nz/search?q=${q}` },
      { key: "thewarren", name: "The Warren", search: (q) => `https://thewarren.co.nz/search?q=${q}` },
      { key: "kapiticards", name: "Kapiti Cards", search: (q) => `https://kapiticards.co.nz/search?q=${q}` },
      { key: "duelmasters_nz", name: "Duel Masters NZ", search: (q) => `https://duelmasters.co.nz/search?q=${q}` },
      { key: "amazon_nz", name: "Amazon", search: (q) => `https://www.amazon.com.au/s?k=${q}` },
      { key: "ebay_nz", name: "eBay", search: (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}` },
    ],
  };
}

// The "main" stores per market (biggest shops + eBay/Amazon), used when a market
// needs a trimmed set to fit a hosting storage cap. Order = priority.
const MAIN = {
  US: ["tcgplayer_us","ebay_us","amazon_us","cardkingdom","starcitygames","channelfireball","coolstuffinc","trollandtoad","abugames","dacardworld"],
  AU: ["ebay","goodgames","guf","cardmania","gauntletgames","cherrycollectables","kingdomofgeek","gameforce","nextlevelgames","mightyape_au"],
  GB: ["ebay_uk","amazon_uk","magicmadhouse","chaoscards","totalcards","manaleak","elementgames","bigorbitcards","goblingaming","hareruya_uk"],
  NZ: ["ebay_nz","amazon_nz","cardmerchant","mightyape_nz","vault_nz","cerberusgames","comicscompulsion","geekzone_nz","thegamesshop_nz","markone"],
};
// Return the top-N main stores per market (default 10), guaranteeing eBay/Amazon.
export function topStores(tcg, n = 10) {
  const full = buildStores(tcg);
  const out = {};
  for (const r of Object.keys(full)) {
    out[r] = MAIN[r].map((k) => full[r].find((s) => s.key === k)).filter(Boolean).slice(0, n);
  }
  return out;
}
