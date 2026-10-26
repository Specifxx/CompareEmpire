// Japanese Pokémon TCG sets whose booster boxes and packs DexCompare compares
// (the Japanese section, /<region>/japanese). Newest first. A separate list
// from SETS (sets.ts) on purpose: a Japanese set is never an English set's
// edition, its products never share an English product's page, and nothing
// that walks SETS (the release calendar, MSRP, pack counts, the guides) sees
// these.
//
// Codes and English names from Samurai Sword Tokyo's set-code list, read
// 2026-10-26 (samuraiswordtokyo.com/pages/japanese-tcg-set-codes). Release
// dates (Japan) from Serebii's Japanese set list, read 2026-10-26, kept only
// where Bulbapedia's list of Japanese expansions or Samurai Sword Tokyo's 2026
// calendar agrees; Storm Emeralda and the 30th Celebration disagree by a few
// days between them, so they have none. A set with no date is treated as
// released (all of them are, as of 2026-10-26). Sword & Shield era sets carry
// no date: none is needed for a released set, and none was checked.
//
// ADDING A SET: add an entry at the top. `code` is the Japanese set code in
// lower case ("sv8a"); the product rows store `ja-<code>` (jaSetCode), so a
// Japanese code never collides with an English one ("sv8" is Surging Sparks in
// English and Super Electric Breaker in Japanese). `slug` must never change
// once live. `aliases` are extra regex sources for other English renderings
// of the name. `nameless` sets are matched by code only: their names are
// ordinary words ("Sword", "Shield") or an English set's name.

export interface JapaneseSet {
  code: string; // the Japanese set code, lower case: "sv8a", "m2a", "s12a"
  name: string; // the English name stores use
  slug: string;
  era: "MEGA" | "Scarlet & Violet" | "Sword & Shield";
  releaseDate: string | null; // YYYY-MM-DD in Japan, or null (see the header)
  aliases?: string[];
  nameless?: boolean;
}

export const JA_SETS: JapaneseSet[] = [
  { code: "m6a", name: "30th Celebration", slug: "30th-celebration", era: "MEGA", releaseDate: null },
  { code: "m6", name: "Storm Emeralda", slug: "storm-emeralda", era: "MEGA", releaseDate: null },
  { code: "m5", name: "Abyss Eye", slug: "abyss-eye", era: "MEGA", releaseDate: "2026-05-22" },
  { code: "m4", name: "Ninja Spinner", slug: "ninja-spinner", era: "MEGA", releaseDate: "2026-03-13" },
  { code: "m3", name: "Nihil Zero", slug: "nihil-zero", era: "MEGA", releaseDate: "2026-01-23", aliases: ["\\bmunikiss?\\s*zero\\b"] },
  { code: "m2a", name: "Mega Dream ex", slug: "mega-dream-ex", era: "MEGA", releaseDate: "2025-11-28", aliases: ["\\bmega\\s*dream\\b"] },
  { code: "m2", name: "Inferno X", slug: "inferno-x", era: "MEGA", releaseDate: "2025-09-26" },
  { code: "m1s", name: "Mega Symphonia", slug: "mega-symphonia", era: "MEGA", releaseDate: "2025-08-01", aliases: ["\\bmega\\s*symphony\\b"] },
  { code: "m1l", name: "Mega Brave", slug: "mega-brave", era: "MEGA", releaseDate: "2025-08-01" },
  { code: "sv11w", name: "White Flare", slug: "white-flare", era: "Scarlet & Violet", releaseDate: "2025-06-06" },
  { code: "sv11b", name: "Black Bolt", slug: "black-bolt", era: "Scarlet & Violet", releaseDate: "2025-06-06" },
  {
    code: "sv10",
    name: "Glory of Team Rocket",
    slug: "glory-of-team-rocket",
    era: "Scarlet & Violet",
    releaseDate: "2025-04-18",
    aliases: ["\\bglory\\s*of\\s*(?:the\\s*)?rocket\\s*gang\\b", "\\bteam\\s*rocket'?s?\\s*glory\\b"],
  },
  { code: "sv9a", name: "Heat Wave Arena", slug: "heat-wave-arena", era: "Scarlet & Violet", releaseDate: "2025-03-14", aliases: ["\\bhot\\s*(?:air|wind)\\s*arena\\b"] },
  { code: "sv9", name: "Battle Partners", slug: "battle-partners", era: "Scarlet & Violet", releaseDate: "2025-01-24" },
  { code: "sv8a", name: "Terastal Festival ex", slug: "terastal-festival-ex", era: "Scarlet & Violet", releaseDate: "2024-12-06", aliases: ["\\bterastal\\s*fest(?:ival)?\\b"] },
  { code: "sv8", name: "Super Electric Breaker", slug: "super-electric-breaker", era: "Scarlet & Violet", releaseDate: "2024-10-18" },
  { code: "sv7a", name: "Paradise Dragona", slug: "paradise-dragona", era: "Scarlet & Violet", releaseDate: "2024-09-13" },
  { code: "sv7", name: "Stellar Miracle", slug: "stellar-miracle", era: "Scarlet & Violet", releaseDate: "2024-07-19", aliases: ["\\bstellar?\\s*miracle\\b"] },
  { code: "sv6a", name: "Night Wanderer", slug: "night-wanderer", era: "Scarlet & Violet", releaseDate: "2024-06-07" },
  { code: "sv6", name: "Mask of Change", slug: "mask-of-change", era: "Scarlet & Violet", releaseDate: "2024-04-26", aliases: ["\\btransformation\\s*mask\\b"] },
  { code: "sv5a", name: "Crimson Haze", slug: "crimson-haze", era: "Scarlet & Violet", releaseDate: "2024-03-22" },
  { code: "sv5m", name: "Cyber Judge", slug: "cyber-judge", era: "Scarlet & Violet", releaseDate: "2024-01-26" },
  { code: "sv5k", name: "Wild Force", slug: "wild-force", era: "Scarlet & Violet", releaseDate: "2024-01-26" },
  { code: "sv4a", name: "Shiny Treasure ex", slug: "shiny-treasure-ex", era: "Scarlet & Violet", releaseDate: "2023-12-01" },
  { code: "sv4m", name: "Future Flash", slug: "future-flash", era: "Scarlet & Violet", releaseDate: "2023-10-27" },
  { code: "sv4k", name: "Ancient Roar", slug: "ancient-roar", era: "Scarlet & Violet", releaseDate: "2023-10-27" },
  { code: "sv3a", name: "Raging Surf", slug: "raging-surf", era: "Scarlet & Violet", releaseDate: "2023-09-22" },
  { code: "sv3", name: "Ruler of the Black Flame", slug: "ruler-of-the-black-flame", era: "Scarlet & Violet", releaseDate: "2023-07-28" },
  // "151" alone is the English set's name too, but this list is only read for titles that say they are Japanese.
  { code: "sv2a", name: "Pokémon Card 151", slug: "pokemon-card-151", era: "Scarlet & Violet", releaseDate: "2023-06-16", aliases: ["\\b151\\b"] },
  { code: "sv2d", name: "Clay Burst", slug: "clay-burst", era: "Scarlet & Violet", releaseDate: "2023-04-14" },
  { code: "sv2p", name: "Snow Hazard", slug: "snow-hazard", era: "Scarlet & Violet", releaseDate: "2023-04-14" },
  { code: "sv1a", name: "Triplet Beat", slug: "triplet-beat", era: "Scarlet & Violet", releaseDate: "2023-03-10" },
  { code: "sv1v", name: "Violet ex", slug: "violet-ex", era: "Scarlet & Violet", releaseDate: "2023-01-20" },
  { code: "sv1s", name: "Scarlet ex", slug: "scarlet-ex", era: "Scarlet & Violet", releaseDate: "2023-01-20" },
  { code: "s12a", name: "VSTAR Universe", slug: "vstar-universe", era: "Sword & Shield", releaseDate: null },
  { code: "s12", name: "Paradigm Trigger", slug: "paradigm-trigger", era: "Sword & Shield", releaseDate: null },
  { code: "s11a", name: "Incandescent Arcana", slug: "incandescent-arcana", era: "Sword & Shield", releaseDate: null },
  { code: "s11", name: "Lost Abyss", slug: "lost-abyss", era: "Sword & Shield", releaseDate: null },
  // The English Pokémon GO set has the same name: code only.
  { code: "s10b", name: "Pokémon GO", slug: "pokemon-go", era: "Sword & Shield", releaseDate: null, nameless: true },
  { code: "s10a", name: "Dark Phantasma", slug: "dark-phantasma", era: "Sword & Shield", releaseDate: null },
  { code: "s10p", name: "Space Juggler", slug: "space-juggler", era: "Sword & Shield", releaseDate: null },
  { code: "s10d", name: "Time Gazer", slug: "time-gazer", era: "Sword & Shield", releaseDate: null },
  { code: "s9a", name: "Battle Region", slug: "battle-region", era: "Sword & Shield", releaseDate: null },
  { code: "s9", name: "Star Birth", slug: "star-birth", era: "Sword & Shield", releaseDate: null },
  { code: "s8b", name: "VMAX Climax", slug: "vmax-climax", era: "Sword & Shield", releaseDate: null },
  { code: "s8a", name: "25th Anniversary Collection", slug: "25th-anniversary-collection", era: "Sword & Shield", releaseDate: null },
  { code: "s8", name: "Fusion Arts", slug: "fusion-arts", era: "Sword & Shield", releaseDate: null },
  { code: "s7r", name: "Blue Sky Stream", slug: "blue-sky-stream", era: "Sword & Shield", releaseDate: null },
  { code: "s7d", name: "Skyscraping Perfection", slug: "skyscraping-perfection", era: "Sword & Shield", releaseDate: null, aliases: ["\\btowering\\s*perfection\\b"] },
  { code: "s6a", name: "Eevee Heroes", slug: "eevee-heroes", era: "Sword & Shield", releaseDate: null },
  { code: "s6k", name: "Jet-Black Spirit", slug: "jet-black-spirit", era: "Sword & Shield", releaseDate: null },
  { code: "s6h", name: "Silver Lance", slug: "silver-lance", era: "Sword & Shield", releaseDate: null },
  { code: "s5a", name: "Peerless Fighters", slug: "peerless-fighters", era: "Sword & Shield", releaseDate: null },
  { code: "s5r", name: "Rapid Strike Master", slug: "rapid-strike-master", era: "Sword & Shield", releaseDate: null },
  { code: "s5i", name: "Single Strike Master", slug: "single-strike-master", era: "Sword & Shield", releaseDate: null },
  { code: "s4a", name: "Shiny Star V", slug: "shiny-star-v", era: "Sword & Shield", releaseDate: null },
  { code: "s4", name: "Amazing Volt Tackle", slug: "amazing-volt-tackle", era: "Sword & Shield", releaseDate: null },
  { code: "s3a", name: "Legendary Heartbeat", slug: "legendary-heartbeat", era: "Sword & Shield", releaseDate: null },
  { code: "s3", name: "Infinity Zone", slug: "infinity-zone", era: "Sword & Shield", releaseDate: null },
  { code: "s2a", name: "Explosive Walker", slug: "explosive-walker", era: "Sword & Shield", releaseDate: null },
  { code: "s2", name: "Rebellion Crash", slug: "rebellion-crash", era: "Sword & Shield", releaseDate: null },
  { code: "s1a", name: "VMAX Rising", slug: "vmax-rising", era: "Sword & Shield", releaseDate: null },
  { code: "s1w", name: "Sword", slug: "sword", era: "Sword & Shield", releaseDate: null, nameless: true },
  { code: "s1h", name: "Shield", slug: "shield", era: "Sword & Shield", releaseDate: null, nameless: true },
];

export const JA_ERA_ORDER: readonly JapaneseSet["era"][] = ["MEGA", "Scarlet & Violet", "Sword & Shield"];

/** The setCode a Japanese product row stores: "ja-sv8a". Never an English set's code. */
export function jaSetCode(set: Pick<JapaneseSet, "code">): string {
  return `ja-${set.code}`;
}

/** A Japanese product row's setCode → its set, or null (an English set's code, or none). */
export const JA_SET_BY_SET_CODE = new Map(JA_SETS.map((s) => [jaSetCode(s), s]));
export const JA_SET_BY_SLUG = new Map(JA_SETS.map((s) => [s.slug, s]));

export function jaSetOf(setCode: string | null | undefined): JapaneseSet | null {
  return setCode ? JA_SET_BY_SET_CODE.get(setCode) ?? null : null;
}

/** Is this a Japanese product's setCode? */
export function isJaSetCode(setCode: string | null | undefined): boolean {
  return !!setCode && setCode.startsWith("ja-");
}

/**
 * The code as the boxes print it: "SV8a", "M2a", "S12a", "S8b" (a sub-set's "a" or "b" stays small) but "SV11B",
 * "SV4K", "M1L", "S10D" (a version letter is a capital).
 */
export function displayCode(set: Pick<JapaneseSet, "code" | "era">): string {
  const m = /^([a-z]+)(\d+)([a-z]?)$/.exec(set.code);
  if (!m) return set.code.toUpperCase();
  const small = m[3] === "a" || (m[3] === "b" && set.era === "Sword & Shield");
  return `${m[1].toUpperCase()}${m[2]}${small ? m[3] : m[3].toUpperCase()}`;
}
