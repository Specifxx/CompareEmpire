// The "Japanese edition" row test (Job A follow-ups, G2; starts 2 Dec 2026, read 16 Dec): on 14 English set pages, one row
// naming the Japanese set the English one was built from, with that set's cheapest open Japanese booster box (else pack)
// in the visitor's market and a link to its own page (components/JapaneseEditionRow.tsx). Always a different product:
// never ranked against the English stores, never called the cheapest, never merged with an English page (sets-ja.ts).
//
// The pairs: each English set and the ONE Japanese set most of its cards come from. A Japanese set is a different
// product (its own card list, Japanese text, fewer cards a pack), and some English sets draw on two Japanese ones; only
// pairs where one Japanese set is clearly the main source are here. Popular modern sets first; no traffic figures were
// read to pick them. Keep this list at 14 until the test is read on 16 Dec (tests/japanese-twins.test.ts).
import { JA_SETS, type JapaneseSet } from "./sets-ja";

export const JA_TWIN_BY_EN: Readonly<Record<string, string>> = {
  sv8pt5: "sv8a", // Prismatic Evolutions ← Terastal Festival ex
  sv8: "sv8", // Surging Sparks ← Super Electric Breaker
  sv7: "sv7", // Stellar Crown ← Stellar Miracle
  sv9: "sv9", // Journey Together ← Battle Partners
  sv10: "sv10", // Destined Rivals ← Glory of Team Rocket
  zsv10pt5: "sv11b", // Black Bolt ← Black Bolt
  rsv10pt5: "sv11w", // White Flare ← White Flare
  sv3pt5: "sv2a", // Scarlet & Violet 151 ← Pokémon Card 151
  sv4pt5: "sv4a", // Paldean Fates ← Shiny Treasure ex
  sv6pt5: "sv6a", // Shrouded Fable ← Night Wanderer
  sv6: "sv6", // Twilight Masquerade ← Mask of Change
  sv3: "sv3", // Obsidian Flames ← Ruler of the Black Flame
  me2: "m2", // Phantasmal Flames ← Inferno X
  swsh12pt5: "s12a", // Crown Zenith ← VSTAR Universe
};

/** The Japanese twin of an English set code, or null. */
export function jaTwinOf(enCode: string): JapaneseSet | null {
  const ja = JA_TWIN_BY_EN[enCode];
  return ja ? JA_SETS.find((s) => s.code === ja) ?? null : null;
}
