// The no-keys fallback of the "Chase cards on eBay" strip: six curated chase cards, each
// a card-art thumbnail, the card's name and a SEARCH on eBay for it (affiliate.ts
// ebayCardSearchUrl). Without EBAY_CLIENT_ID / EBAY_CLIENT_SECRET this is what the home page
// and the landing page show. It is explicitly a search, never a listing: no price, no
// count, no "available", and the unit says "Search eBay for…".
//
// Pure data (no fetch, no secrets). The card art is self-hosted: public/chase/<id>.webp, 245x342
// WebP copies (20-35 KB each; the originals are ~200 KB PNGs) of the card images that
// images.pokemontcg.io serves, so six tiles weigh ~175 KB instead of ~1.3 MB, and the strip
// does not depend on that host (its API is deprecated: docs.pokemontcg.io says existing keys
// work until 1 Mar 2027 and the project is now part of Scrydex). Each `source` URL was fetched
// on 2026-10-05 and answered 200 image/png (a card id that does not exist answers 404 with a
// placeholder PNG, so the status matters); the cards' names and rarities were read from
// api.pokemontcg.io. The artwork is the property of The Pokémon Company and its artists; it is
// shown only as a thumbnail of the card a search is for (see DEPLOY.md). tests/chase-cards.test.ts
// keeps the shape honest and checks that every file exists.
//
// The tiles load them lazily with explicit width/height.

export interface ChaseCard {
  /** pokemontcg.io card id. */
  id: string;
  name: string;
  set: string;
  /** Rarity as pokemontcg.io lists it. */
  rarity: string;
  /** Same-origin path of the self-hosted thumbnail. */
  image: string;
  /** Where the picture came from (provenance only; never rendered or fetched). */
  source: string;
  /** What the eBay search looks for: the card, its set and number (affiliate.ts ebayCardSearchUrl adds "Pokemon"). */
  query: string;
}

/** The thumbnails' pixel size: the tiles use a 5:7 box, and these are the files' intrinsic dimensions (width/height attributes avoid layout shift). */
export const CHASE_IMAGE = { width: 245, height: 342 } as const;

export const CHASE_CARDS: readonly ChaseCard[] = [
  { id: "sv4pt5-234", name: "Charizard ex", set: "Paldean Fates", rarity: "Special Illustration Rare", image: "/chase/sv4pt5-234.webp", source: "https://images.pokemontcg.io/sv4pt5/234.png", query: "Charizard ex Paldean Fates 234 special illustration rare" },
  { id: "sv8pt5-161", name: "Umbreon ex", set: "Prismatic Evolutions", rarity: "Special Illustration Rare", image: "/chase/sv8pt5-161.webp", source: "https://images.pokemontcg.io/sv8pt5/161.png", query: "Umbreon ex Prismatic Evolutions 161 special illustration rare" },
  { id: "sv8-238", name: "Pikachu ex", set: "Surging Sparks", rarity: "Special Illustration Rare", image: "/chase/sv8-238.webp", source: "https://images.pokemontcg.io/sv8/238.png", query: "Pikachu ex Surging Sparks 238 special illustration rare" },
  { id: "me2-125", name: "Mega Charizard X ex", set: "Phantasmal Flames", rarity: "Special Illustration Rare", image: "/chase/me2-125.webp", source: "https://images.pokemontcg.io/me2/125.png", query: "Mega Charizard X ex Phantasmal Flames 125 special illustration rare" },
  { id: "sv10-231", name: "Team Rocket's Mewtwo ex", set: "Destined Rivals", rarity: "Special Illustration Rare", image: "/chase/sv10-231.webp", source: "https://images.pokemontcg.io/sv10/231.png", query: "Team Rocket's Mewtwo ex Destined Rivals 231 special illustration rare" },
  { id: "sv3pt5-200", name: "Blastoise ex", set: "Scarlet & Violet 151", rarity: "Special Illustration Rare", image: "/chase/sv3pt5-200.webp", source: "https://images.pokemontcg.io/sv3pt5/200.png", query: "Blastoise ex 151 200 special illustration rare" },
];
