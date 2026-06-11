// The five TCGs TCGPriceEmpire covers, and everything game-specific the rest of
// the codebase needs (display names, URL slugs, TCGplayer product lines, accent
// colours, sister-site deep links). This module is PURE (no DB / no next
// imports) so it's safe in client components, server components and scripts.

export type GameKey = "pokemon" | "magic" | "yugioh" | "onepiece" | "riftbound";

export interface GameInfo {
  key: GameKey;
  name: string; // full display name
  short: string; // compact name for chips/buttons
  slug: string; // URL path segment for the game hub (/pokemon, /magic, …)
  tagline: string;
  color: string; // accent hex used for game chips/badges
  icon: string; // emoji marker for pickers/chips
  // TCGplayer search API productLineName filter value (the URL-style line name —
  // verified against the working dexcompare/riftcompare importers).
  tcgProductLine: string;
  // Appended to eBay/Amazon search queries so results stay in-game.
  searchSuffix: string;
  // Sister site with deeper store-by-store coverage (AU/NZ/US/UK Shopify stores).
  specialist?: { name: string; url: string; blurb: string };
  seoDescription: string;
}

export const GAMES: Record<GameKey, GameInfo> = {
  pokemon: {
    key: "pokemon",
    name: "Pokémon TCG",
    short: "Pokémon",
    slug: "pokemon",
    tagline: "Charizards, alt arts & every set from Base to today",
    color: "#ffcb05",
    icon: "⚡",
    tcgProductLine: "pokemon",
    searchSuffix: "pokemon card",
    specialist: {
      name: "DexCompare",
      url: "https://dexcompare.app",
      blurb: "store-by-store Pokémon price comparison across Australia, New Zealand, the US and the UK",
    },
    seoDescription:
      "Compare Pokémon TCG card and sealed product prices across TCGplayer, eBay and more — find the cheapest place to buy any Pokémon card.",
  },
  magic: {
    key: "magic",
    name: "Magic: The Gathering",
    short: "Magic",
    slug: "magic",
    tagline: "Every paper printing, priced on TCGplayer & Cardmarket",
    color: "#f97316",
    icon: "🔥",
    tcgProductLine: "magic",
    searchSuffix: "mtg",
    seoDescription:
      "Compare Magic: The Gathering card prices across TCGplayer (US) and Cardmarket (EU) — find the cheapest printing of any MTG card.",
  },
  yugioh: {
    key: "yugioh",
    name: "Yu-Gi-Oh!",
    short: "Yu-Gi-Oh!",
    slug: "yugioh",
    tagline: "TCGplayer, Cardmarket, eBay & Amazon prices side by side",
    color: "#a78bfa",
    icon: "🃏",
    tcgProductLine: "yugioh",
    searchSuffix: "yugioh card",
    seoDescription:
      "Compare Yu-Gi-Oh! card prices across TCGplayer, Cardmarket, eBay, Amazon and CoolStuffInc — the fastest way to find the cheapest copy.",
  },
  onepiece: {
    key: "onepiece",
    name: "One Piece Card Game",
    short: "One Piece",
    slug: "one-piece",
    tagline: "Leaders, alt arts & sealed — priced on the US market",
    color: "#ef4444",
    icon: "🏴‍☠️",
    tcgProductLine: "one-piece-card-game",
    searchSuffix: "one piece card game",
    seoDescription:
      "Compare One Piece Card Game prices — live TCGplayer market prices for every Leader, alt art and sealed product, plus eBay comparisons.",
  },
  riftbound: {
    key: "riftbound",
    name: "Riftbound (League of Legends TCG)",
    short: "Riftbound",
    slug: "riftbound",
    tagline: "The League of Legends TCG — priced from day one",
    color: "#38bdf8",
    icon: "⚔️",
    tcgProductLine: "riftbound-league-of-legends-trading-card-game",
    searchSuffix: "riftbound tcg",
    specialist: {
      name: "RiftCompare",
      url: "https://riftcompare.com",
      blurb: "store-by-store Riftbound price comparison across Australia, New Zealand, the US and the UK",
    },
    seoDescription:
      "Compare Riftbound (League of Legends TCG) card and sealed prices — live TCGplayer market prices plus eBay comparisons for every card.",
  },
};

export const GAME_KEYS: GameKey[] = ["pokemon", "magic", "yugioh", "onepiece", "riftbound"];
export const GAME_LIST: GameInfo[] = GAME_KEYS.map((k) => GAMES[k]);

// "Which games do you play?" — the visitor's selection, stored as a CSV cookie
// (like dexcompare's country cookie). Empty/missing/invalid → all games.
export const GAMES_COOKIE = "games";

const VALID = new Set<string>(GAME_KEYS);

export function normalizeGames(v: string | undefined | null): GameKey[] {
  const picked = (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is GameKey => VALID.has(s));
  // De-dupe while keeping the canonical order.
  const set = new Set(picked);
  const out = GAME_KEYS.filter((k) => set.has(k));
  return out.length ? out : [...GAME_KEYS];
}

export function isGameKey(v: string): v is GameKey {
  return VALID.has(v);
}

export function gameBySlug(slug: string): GameInfo | null {
  return GAME_LIST.find((g) => g.slug === slug) ?? null;
}
