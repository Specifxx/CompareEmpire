// Central config for the Australian retailers we compare. Used by both the price
// importer (scripts/import-prices.ts via src/lib/price-import.ts) and the UI.
//
// Shipping figures are ESTIMATES for the typical "single card" postage at each
// store (tracked/letter), with a free-shipping threshold. Adjust these to match
// each retailer's real published rates.

export interface RetailerInfo {
  key: string;
  name: string;
  base: string; // origin, no trailing slash
  collections: string[]; // Shopify collection handles holding Pokémon singles
  shippingFlatCents: number; // estimated postage for a single card
  freeOverCents: number; // order total at/above which shipping is free
  shippingNote: string;
  // Market the store serves. Omitted = "AU" (the original Australian stores). NZ/US/GB
  // stores are scraped with ?country=NZ/US/GB and priced in NZD/USD/GBP. eBay runs for AU+US.
  country?: "AU" | "NZ" | "US" | "GB";
}

export const RETAILERS: Record<string, RetailerInfo> = {
  cherry: {
    key: "cherry",
    name: "Cherry Collectables",
    base: "https://www.cherrycollectables.com.au",
    collections: ["riftbound-singles"],
    shippingFlatCents: 395,
    freeOverCents: 5000,
    shippingNote: "est. $3.95 tracked · free over $50",
  },
  ozzie: {
    key: "ozzie",
    name: "Ozzie Collectables",
    base: "https://www.ozziecollectables.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 350,
    freeOverCents: 6000,
    shippingNote: "est. $3.50 · free over $60",
  },
  finalboss: {
    key: "finalboss",
    name: "The Final Boss Collectables",
    base: "https://thefinalbosscollectables.com.au",
    collections: ["riftbound-tcg-singles"],
    shippingFlatCents: 199,
    freeOverCents: 3000,
    shippingNote: "est. $1.99 letter · free over $30",
  },
  plenty: {
    key: "plenty",
    name: "Plenty of Games",
    base: "https://plenty-of-games-au.myshopify.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 250,
    freeOverCents: 8000,
    shippingNote: "est. $2.50 · free over $80",
  },
  adventurers: {
    key: "adventurers",
    name: "The Adventurers Guild",
    base: "https://www.theadventurersguild.com.au",
    collections: ["riftbound-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  // NOTE: General Games' product feed reports every item as out-of-stock
  // (a platform quirk), so it's excluded to honour the "no out-of-stock" rule.
  // Re-add here if they expose reliable stock, or to show their prices anyway.
  manamarket: {
    key: "manamarket",
    name: "Mana Market",
    base: "https://manamarket.com.au",
    collections: ["riftbound-singles"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. $1.50 · free over $30",
  },
  steelcity: {
    key: "steelcity",
    name: "Steel City Games",
    base: "https://www.steelcitygames.com.au",
    collections: ["riftbound-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  cardbot: {
    key: "cardbot",
    name: "Cardbot",
    base: "https://cardbot.com.au",
    collections: ["riftbound-origins-singles"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. $1.50 · free over $30",
  },
  // Domain-only entries: collections are auto-discovered from each store's sitemap
  // (handles vary, e.g. "riftbound-singles-4-or-more", "riftbound-league-of-legends-tcg").
  ggadelaide: {
    key: "ggadelaide",
    name: "Good Games Adelaide",
    base: "https://ggadelaide.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  goodgames: {
    key: "goodgames",
    name: "Good Games",
    base: "https://www.goodgames.com.au",
    collections: [],
    shippingFlatCents: 300,
    freeOverCents: 6000,
    shippingNote: "est. $3.00 · free over $60",
  },
  vaultgames: {
    key: "vaultgames",
    name: "Vault Games",
    base: "https://vaultgames.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  mintcollectables: {
    key: "mintcollectables",
    name: "Mint Collectables",
    base: "https://mintcollectables.com.au",
    collections: [],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. $1.50 · free over $30",
  },
  cardhub: {
    key: "cardhub",
    name: "The Card Hub Australia",
    base: "https://thecardhubaustralia.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 4000,
    shippingNote: "est. $2.00 · free over $40",
  },
  pokebox: {
    key: "pokebox",
    name: "PokéBox",
    base: "https://www.pokebox.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  spellroo: {
    key: "spellroo",
    name: "Spellroo Gaming",
    base: "https://spellroogaming.com.au",
    collections: ["riftbound-league-of-legends-tcg-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  spindown: {
    key: "spindown",
    name: "Spindown",
    base: "https://spindown.com.au",
    collections: ["riftbound-league-of-legends"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  // Additional Australian Pokémon stores. Collections are auto-discovered from each
  // store's Shopify sitemap (Pokémon-singles handles), so only the domain is needed.
  collectiblemadness: {
    key: "collectiblemadness",
    name: "Collectible Madness",
    base: "https://collectiblemadness.com.au",
    collections: [],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. $2.50 · free over $50",
  },
  chimera: {
    key: "chimera",
    name: "Chimera Gaming",
    base: "https://chimeragaming.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  gamescapital: {
    key: "gamescapital",
    name: "The Games Capital",
    base: "https://www.thegamescapital.com.au",
    collections: [],
    shippingFlatCents: 300,
    freeOverCents: 6000,
    shippingNote: "est. $3.00 · free over $60",
  },
  gameology: {
    key: "gameology",
    name: "Gameology",
    base: "https://www.gameology.com.au",
    collections: [],
    shippingFlatCents: 300,
    freeOverCents: 6000,
    shippingNote: "est. $3.00 · free over $60",
  },
  bantertoys: {
    key: "bantertoys",
    name: "Banter Toys & Collectables",
    base: "https://bantertoys.com.au",
    collections: [],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. $2.50 · free over $50",
  },
  kingofcards: {
    key: "kingofcards",
    name: "King of Cards",
    base: "https://kingofcards.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  skyfoxes: {
    key: "skyfoxes",
    name: "Sky Foxes Cards",
    base: "https://skyfoxescards.com.au",
    collections: [],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  // More local Australian Pokémon singles stores (Shopify; collections auto-discovered
  // from each store's sitemap). Adds real AU buyable coverage so the AU market isn't
  // leaning on the market-guide estimate.
  tcgsingles: {
    key: "tcgsingles",
    name: "TCG Singles Australia",
    base: "https://tcgsingles.com.au",
    collections: ["pokemon-singles", "pokemon-singles-instock"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. $1.50 · free over $50",
  },
  ggtcg: {
    key: "ggtcg",
    name: "Good Games TCG",
    base: "https://tcg.goodgames.com.au",
    collections: ["pokemon-singles-in-stock", "pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 6000,
    shippingNote: "est. $2.00 · free over $60",
  },
  kollecter: {
    key: "kollecter",
    name: "Kollecter",
    base: "https://www.kollecter.com.au",
    collections: ["pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  progamers: {
    key: "progamers",
    name: "Pro Gamers & Collectables",
    base: "https://progamers.com.au",
    collections: ["pokemon-singles-instock", "pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  guf: {
    key: "guf",
    name: "Guf",
    base: "https://guf.com.au",
    collections: ["pokemon-singles-all", "pokemon-singles"],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. $2.50 · free over $50",
  },
  tabletopgaminghub: {
    key: "tabletopgaminghub",
    name: "Tabletop Gaming Hub",
    base: "https://tabletopgaminghub.com.au",
    collections: ["pokemon-singles-instock", "pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  irresistibleforce: {
    key: "irresistibleforce",
    name: "Irresistible Force TCG",
    base: "https://tcg.irresistibleforce.com.au",
    collections: ["pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  trollaustralia: {
    key: "trollaustralia",
    name: "Troll Australia",
    base: "https://www.trollaustralia.com.au",
    collections: ["pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },
  area52: {
    key: "area52",
    name: "Area52 Hobart",
    base: "https://singles.area52.com.au",
    collections: ["pokemon-singles-instock", "pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. $2.00 · free over $50",
  },

  // ---- New Zealand stores (country: "NZ"; prices in NZD; never use eBay) -------
  // Collections are mostly auto-discovered from each store's Shopify sitemap; a few
  // explicit handles are given as a fallback. Shipping figures are NZD estimates.
  cardmasters: {
    key: "cardmasters",
    name: "Card Masters",
    base: "https://cardmasters.co.nz",
    collections: ["riftbound-league-of-legends-singles"],
    shippingFlatCents: 350,
    freeOverCents: 6000,
    shippingNote: "est. NZ$3.50 · free over NZ$60",
    country: "NZ",
  },
  tcgcollectornz: {
    key: "tcgcollectornz",
    name: "TCG Collector NZ",
    base: "https://tcgcollectornz.com",
    collections: ["riftbound-all-singles"],
    shippingFlatCents: 300,
    freeOverCents: 5000,
    shippingNote: "est. NZ$3.00 · free over NZ$50",
    country: "NZ",
  },
  cardmerchant: {
    key: "cardmerchant",
    name: "Card Merchant NZ",
    base: "https://cardmerchant.co.nz",
    collections: ["riftbound-singles"],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. NZ$2.50 · free over NZ$50",
    country: "NZ",
  },
  ironknight: {
    key: "ironknight",
    name: "Iron Knight Gaming",
    base: "https://ironknightgaming.co.nz",
    collections: ["riftbound-singles-in-stock"],
    shippingFlatCents: 300,
    freeOverCents: 5000,
    shippingNote: "est. NZ$3.00 · free over NZ$50",
    country: "NZ",
  },
  calicokeep: {
    key: "calicokeep",
    name: "Calico Keep",
    base: "https://www.calicokeep.co.nz",
    collections: ["riftbound-single-in-stock"],
    shippingFlatCents: 350,
    freeOverCents: 6000,
    shippingNote: "est. NZ$3.50 · free over NZ$60",
    country: "NZ",
  },
  cardbotnz: {
    key: "cardbotnz",
    name: "Card Bot NZ",
    base: "https://cardbot.co.nz",
    collections: ["riftbound-origins-singles"],
    shippingFlatCents: 200,
    freeOverCents: 4000,
    shippingNote: "est. NZ$2.00 · free over NZ$40",
    country: "NZ",
  },
  gamingdna: {
    key: "gamingdna",
    name: "Gaming DNA",
    base: "https://gamingdna.co.nz",
    collections: ["riftbound-league-of-legends-tcg"],
    shippingFlatCents: 300,
    freeOverCents: 5000,
    shippingNote: "est. NZ$3.00 · free over NZ$50",
    country: "NZ",
  },
  beagames: {
    key: "beagames",
    name: "Bea Games",
    base: "https://www.beadndgames.co.nz",
    collections: ["riftbound-league-of-legends-singles"],
    shippingFlatCents: 300,
    freeOverCents: 5000,
    shippingNote: "est. NZ$3.00 · free over NZ$50",
    country: "NZ",
  },
  shuffleandcut: {
    key: "shuffleandcut",
    name: "Shuffle n Cut Games",
    base: "https://www.shuffleandcutgames.co.nz",
    collections: ["riftbound"],
    shippingFlatCents: 350,
    freeOverCents: 6000,
    shippingNote: "est. NZ$3.50 · free over NZ$60",
    country: "NZ",
  },
  gameroost: {
    key: "gameroost",
    name: "Game Roost",
    base: "https://www.gameroost.co.nz",
    collections: ["riftbound-league-of-legends-tcg-auckland"],
    shippingFlatCents: 350,
    freeOverCents: 6000,
    shippingNote: "est. NZ$3.50 · free over NZ$60",
    country: "NZ",
  },

  // ---- United States stores (country: "US"; prices in USD; uses eBay US) --------
  // The US market is much deeper — these carry thousands of in-stock singles between
  // them. Collections are mostly auto-discovered; an explicit singles handle is given
  // as a fallback. Shipping figures are USD estimates.
  mythicstore: {
    key: "mythicstore",
    name: "The Mythic Store",
    base: "https://themythicstore.com",
    collections: ["riftbound-origins-singles"],
    shippingFlatCents: 199,
    freeOverCents: 5000,
    shippingNote: "est. US$1.99 · free over US$50",
    country: "US",
  },
  danireon: {
    key: "danireon",
    name: "Danireon Cards & Games",
    base: "https://www.danireon.com",
    collections: ["riftbound-tcg-singles"],
    shippingFlatCents: 499,
    freeOverCents: 10000,
    shippingNote: "est. US$4.99 · free over US$100",
    country: "US",
  },
  punkouter: {
    key: "punkouter",
    name: "PunkOuter Games",
    base: "https://punkouter.com",
    collections: ["riftbound-singles-in-stock"],
    shippingFlatCents: 150,
    freeOverCents: 4000,
    shippingNote: "est. US$1.50 · free over US$40",
    country: "US",
  },
  gglegends: {
    key: "gglegends",
    name: "GG Legends",
    base: "https://store.gglehi.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. US$2.50 · free over US$50",
    country: "US",
  },
  stompinggrounds: {
    key: "stompinggrounds",
    name: "Stomping Grounds TCG",
    base: "https://singles.stompinggroundstcg.com",
    collections: ["riftbound-league-of-legends"],
    shippingFlatCents: 199,
    freeOverCents: 3500,
    shippingNote: "est. US$1.99 · free over US$35",
    country: "US",
  },
  mistymountain: {
    key: "mistymountain",
    name: "Misty Mountain Games",
    base: "https://www.mistymountaingames.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },
  theboosterbox: {
    key: "theboosterbox",
    name: "The Booster Box",
    base: "https://theboosterbox.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 250,
    freeOverCents: 5000,
    shippingNote: "est. US$2.50 · free over US$50",
    country: "US",
  },
  npcollectibles: {
    key: "npcollectibles",
    name: "NP Collectibles",
    base: "https://npcollectibles.com",
    collections: ["riftbound-origin-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },
  capefear: {
    key: "capefear",
    name: "Cape Fear Collectibles",
    base: "https://www.capefearcollectibles.com",
    collections: ["riftbound-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },
  hobbiesville: {
    key: "hobbiesville",
    name: "Hobbiesville",
    base: "https://hobbiesville.com",
    collections: ["riftbound-singles-league-of-legends-tcg"],
    shippingFlatCents: 499,
    freeOverCents: 17500,
    shippingNote: "est. US$4.99 · free over US$175",
    country: "US",
  },
  kanzengames: {
    key: "kanzengames",
    name: "KanZenGames",
    base: "https://kanzengames.com",
    collections: ["riftbound-tcg-singles-all"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  // Additional US Pokémon Shopify stores (collections auto-discovered from each
  // store's sitemap; an explicit singles handle is given as a fallback).
  pokemonplug: {
    key: "pokemonplug",
    name: "Pokemon Plug",
    base: "https://pokemonplug.com",
    collections: ["pokemon-singles-in-stock"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  pokecollect: {
    key: "pokecollect",
    name: "Poke-Collect",
    base: "https://poke-collect.com",
    collections: ["pokemon-singles-instock"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },
  boardwalkgreenville: {
    key: "boardwalkgreenville",
    name: "Boardwalk Greenville",
    base: "https://boardwalkgreenville.myshopify.com",
    collections: ["pokemon-singles-all"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  jrwhobby: {
    key: "jrwhobby",
    name: "JRW Hobby Station",
    base: "https://jrwhobbystation.myshopify.com",
    collections: ["pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 4000,
    shippingNote: "est. US$1.50 · free over US$40",
    country: "US",
  },
  pegasusgames: {
    key: "pegasusgames",
    name: "Pegasus Games WI",
    base: "https://pegasus-games-wi.myshopify.com",
    collections: ["pokemon-singles"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },
  cardcavern: {
    key: "cardcavern",
    name: "Card Cavern Trading Cards",
    base: "https://www.cardcaverntradingcards.com",
    collections: ["all-pokemon-singles-in-stock"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  // Additional US Pokémon Shopify stores (round 2). Domains verified Shopify via
  // /collections paths or .myshopify.com; collections auto-discovered from each
  // store's sitemap, with a Pokémon-singles handle as fallback. Each is validated
  // by scripts/probe-stores.ts before we trust its prices.
  mulliganmerchant: {
    key: "mulliganmerchant",
    name: "Mulligan Merchant",
    base: "https://mulliganmerchant.myshopify.com",
    collections: ["pokemon-singles-instock"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  mostexcellent: {
    key: "mostexcellent",
    name: "Most Excellent Gaming",
    base: "https://most-excellent-gaming-ma.myshopify.com",
    collections: ["pokemon-singles-instock"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  onestoptcg: {
    key: "onestoptcg",
    name: "OneStopTCG",
    base: "https://onestoptcg.com",
    collections: ["pokemon-trading-card-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  vegassingles: {
    key: "vegassingles",
    name: "Vegas Singles",
    base: "https://vegas.singles",
    collections: ["pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  tcgtemple: {
    key: "tcgtemple",
    name: "TCG Temple",
    base: "https://tcgtemple.myshopify.com",
    collections: ["pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  headsortails: {
    key: "headsortails",
    name: "Heads or Tails Gaming",
    base: "https://heads-or-tails-gaming-inc.myshopify.com",
    collections: ["pokemon-singles-all"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  ubecard: {
    key: "ubecard",
    name: "UbeCard",
    base: "https://ubecard.com",
    collections: ["pokemon-singles-in-stock", "pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  galaxygames: {
    key: "galaxygames",
    name: "Galaxy Games LLC",
    base: "https://galaxygamesllc.com",
    collections: ["pokemon-singles-instock", "pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  gamersgrove: {
    key: "gamersgrove",
    name: "Gamers Grove",
    base: "https://gamersgrove.com",
    collections: ["pokemon-singles-in-stock", "pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 5000,
    shippingNote: "est. US$1.50 · free over US$50",
    country: "US",
  },
  guardiangames: {
    key: "guardiangames",
    name: "Guardian Games Portland",
    base: "https://guardian-games-llc.myshopify.com",
    collections: ["pokemon-singles", "pokemon"],
    shippingFlatCents: 200,
    freeOverCents: 5000,
    shippingNote: "est. US$2.00 · free over US$50",
    country: "US",
  },

  // ---- United Kingdom stores (country: "GB"; prices in GBP; never use eBay) -----
  // The UK market previously had no live store prices (only Cardmarket via the seed).
  // These are Shopify storefronts; collections are auto-discovered from each store's
  // sitemap, with an explicit Pokémon-singles handle as a fallback. Shipping figures
  // are GBP estimates.
  titancards: {
    key: "titancards",
    name: "Titan Cards",
    base: "https://titancards.co.uk",
    collections: ["pokemon-singles-uk", "card-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2000,
    shippingNote: "est. £1.20 · free over £20",
    country: "GB",
  },
  totalcards: {
    key: "totalcards",
    name: "Total Cards",
    base: "https://totalcards.net",
    collections: ["pokemon-single-cards"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. £1.50 · free over £30",
    country: "GB",
  },
  pokephd: {
    key: "pokephd",
    name: "PokePhD",
    base: "https://pokephd.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  dicesaloon: {
    key: "dicesaloon",
    name: "Dice Saloon Singles",
    base: "https://dicesaloonsingles.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. £1.50 · free over £30",
    country: "GB",
  },
  bossminis: {
    key: "bossminis",
    name: "Boss Minis",
    base: "https://bossminis.co.uk",
    collections: ["pokemon-singles-in-stock"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. £1.50 · free over £30",
    country: "GB",
  },
  // Additional UK Pokémon Shopify stores (round 2). Each validated by
  // scripts/probe-stores.ts before its prices are trusted.
  cardgoblin: {
    key: "cardgoblin",
    name: "Card Goblin",
    base: "https://www.cardgoblin.shop",
    collections: ["pokemon-singles-1", "pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  doublesleeved: {
    key: "doublesleeved",
    name: "Double Sleeved",
    base: "https://www.doublesleeved.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  lvlupgaming: {
    key: "lvlupgaming",
    name: "Lvl Up Gaming UK",
    base: "https://lvlupgaming.co.uk",
    collections: ["pokemon-singles-all", "pokemon-singles"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. £1.50 · free over £30",
    country: "GB",
  },
  collectbydesign: {
    key: "collectbydesign",
    name: "Collect by Design",
    base: "https://www.collectbydesign.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  collecteebles: {
    key: "collecteebles",
    name: "Collecteebles",
    base: "https://collecteebles.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  jarvvos: {
    key: "jarvvos",
    name: "Jarvvos",
    base: "https://www.jarvvos.co.uk",
    collections: ["pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  cardrush: {
    key: "cardrush",
    name: "CardRush UK",
    base: "https://cardrush.co.uk",
    collections: ["pokemon-single", "pokemon-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
  gocardsuk: {
    key: "gocardsuk",
    name: "Go Cards UK",
    base: "https://gocardsuk.co.uk",
    collections: ["pokemon-singles", "pokemon"],
    shippingFlatCents: 150,
    freeOverCents: 3000,
    shippingNote: "est. £1.50 · free over £30",
    country: "GB",
  },
  eternacards: {
    key: "eternacards",
    name: "Eterna Cards",
    base: "https://eternacards.co.uk",
    collections: ["pokemon-singles", "pokemon-tcg-singles"],
    shippingFlatCents: 120,
    freeOverCents: 2500,
    shippingNote: "est. £1.20 · free over £25",
    country: "GB",
  },
};

export const RETAILER_LIST = Object.values(RETAILERS);

// The market a store serves (defaults to AU for the original stores).
export function retailerCountry(retailerKey: string): "AU" | "NZ" | "US" | "GB" {
  return RETAILERS[retailerKey]?.country ?? "AU";
}

// Estimated flat postage for a single card. We always show a shipping estimate
// (never "free" — we can't confirm free shipping, and we don't want everything
// marked "unknown" either). null only if the retailer isn't configured.
export function shippingCents(retailerKey: string): number | null {
  const r = RETAILERS[retailerKey];
  if (!r) return null;
  return r.shippingFlatCents;
}

// Estimated delivered cost (item + estimated shipping).
export function deliveredCents(retailerKey: string, priceCents: number): number {
  return priceCents + (shippingCents(retailerKey) ?? 0);
}

// The shipping cost for a single listing — returned ONLY when we genuinely know it.
// eBay's Browse API gives a real per-listing figure (including 0 = seller states
// free post), so those are exact. Everywhere else (Shopify stores, TCGplayer)
// postage is calculated at checkout and we don't actually know it, so we return
// `null` = "unknown" rather than a fabricated flat estimate. Accuracy over
// exhaustiveness — wrong delivery prices erode trust (and drew user complaints).
export function effectiveShippingCents(rowShippingCents: number | null): number | null {
  return rowShippingCents;
}

// Stores with a verified Shopify shipping-policy page (all at /policies/shipping-policy).
// We can't reliably parse a flat rate from the free-text policy, so rather than
// fabricate a number we link customers straight to the policy for the real current
// rate. (Verified by probing every store; 42/45 have one.)
const STORES_WITH_POLICY = new Set([
  "cherry", "finalboss", "plenty", "adventurers", "manamarket", "cardbot", "ggadelaide",
  "goodgames", "vaultgames", "mintcollectables", "cardhub", "pokebox", "spellroo", "spindown",
  "collectiblemadness", "chimera", "gamescapital", "gameology", "bantertoys", "kingofcards", "skyfoxes",
  "tcgsingles", "ggtcg", "kollecter", "progamers", "guf", "tabletopgaminghub", "irresistibleforce", "trollaustralia", "area52",
  "cardmasters", "tcgcollectornz", "cardmerchant", "ironknight", "calicokeep", "cardbotnz",
  "gamingdna", "beagames", "shuffleandcut", "gameroost", "mythicstore",
  "danireon", "punkouter", "gglegends", "stompinggrounds",
  "mistymountain", "theboosterbox", "npcollectibles", "capefear", "hobbiesville", "kanzengames",
  "pokemonplug", "pokecollect", "boardwalkgreenville", "jrwhobby", "pegasusgames", "cardcavern",
  "mulliganmerchant", "mostexcellent", "onestoptcg", "vegassingles", "tcgtemple", "headsortails",
  "ubecard", "galaxygames", "gamersgrove", "guardiangames",
  "titancards", "totalcards", "pokephd", "dicesaloon", "bossminis",
  "cardgoblin", "doublesleeved", "lvlupgaming", "collectbydesign", "collecteebles", "jarvvos",
  "cardrush", "gocardsuk", "eternacards",
]);

// The store's shipping-policy page URL, or null if it doesn't have one / isn't a store.
export function shippingPolicyUrl(retailerKey: string): string | null {
  const r = RETAILERS[retailerKey];
  return r && STORES_WITH_POLICY.has(retailerKey) ? `${r.base}/policies/shipping-policy` : null;
}
