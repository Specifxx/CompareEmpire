// Quick offline test for the Pokémon title→card matcher (no DB / network needed):
//   npx tsx scripts/test-matcher.ts
import { buildPokemonResolver, MatchCard } from "../src/lib/price-import";

const cards: MatchCard[] = [
  { id: "charizard-obf", name: "Charizard ex", setName: "Obsidian Flames", collectorNumber: "125/197" },
  { id: "charizard-obf-sir", name: "Charizard ex", setName: "Obsidian Flames", collectorNumber: "223/197" },
  { id: "pikachu-svbase", name: "Pikachu", setName: "Scarlet & Violet Base Set", collectorNumber: "58/198" },
  { id: "mewtwo-pgo", name: "Mewtwo VSTAR", setName: "Pokémon GO", collectorNumber: "31/78" },
  { id: "umbreon-evs", name: "Umbreon VMAX", setName: "Evolving Skies", collectorNumber: "215/203" },
  { id: "research-brs", name: "Professor's Research", setName: "Brilliant Stars", collectorNumber: "147/172" },
  // Cross-set number collision: another set sized 197 with the same number 125.
  { id: "decoy-other", name: "Magnezone", setName: "Paradox Rift", collectorNumber: "125/182" },
  { id: "rayquaza-pgo", name: "Rayquaza", setName: "Pokémon GO", collectorNumber: "32/78" },
  // Regression fixtures for the real mismatches the audit surfaced:
  { id: "wash-rotom-rr", name: "Wash Rotom", setName: "Rising Rivals", collectorNumber: "RT5/111" }, // shares "Rivals" with Destined Rivals
  { id: "magneton-base", name: "Magneton", setName: "Base", collectorNumber: "9/102" }, // shares "Base" with SV Base Set
  { id: "arceus-pl", name: "Arceus", setName: "Arceus", collectorNumber: "AR5/99" }, // base card vs "Arceus V"
  { id: "luxray-lvx", name: "Luxray GL LV.X", setName: "Rising Rivals", collectorNumber: "109/111" },
  { id: "zekrom-bw", name: "Zekrom", setName: "Black & White", collectorNumber: "114/114" }, // base vs "Zekrom ex"
];

const resolve = buildPokemonResolver(cards);

const cases: [string, string | null][] = [
  ["Charizard ex - Obsidian Flames - 125/197 - Double Rare (Near Mint)", "charizard-obf"],
  ["Charizard ex (223/197) Obsidian Flames Special Illustration Rare", "charizard-obf-sir"],
  ["Pikachu 058/198 - Scarlet & Violet Base Set - Common", "pikachu-svbase"],
  ["Mewtwo VSTAR 031/078 Pokemon GO Holo", "mewtwo-pgo"],
  ["Umbreon VMAX Alt Art - 215/203 - Evolving Skies", "umbreon-evs"],
  ["Professor's Research (Full Art) - Brilliant Stars 147/172", "research-brs"],
  // No collector number in the title → must use name + set name.
  ["Umbreon VMAX - Evolving Skies (Alternate Art Secret)", "umbreon-evs"],
  // Multi-card listing must NOT match a single card.
  ["Charizard ex Obsidian Flames 125/197 PLAYSET x4", null],
  // A title with NO card name must not be assigned on number+set alone.
  ["Some Random Card 125/182 Paradox Rift", null],
  // Unknown card → null.
  ["Snorlax 999/999 Made Up Set", null],

  // ── Regression: cross-set / cross-variant mismatches (from the live audit) ──
  // Shared set-name word ("Rivals") + a different number must NOT match.
  ["Wash Rotom 061  SV10 Destined Rivals - Common", null],
  // Shared set-name word ("Base") + a different number must NOT match.
  ["Magneton 64 - SV01 Scarlet & Violet Base Set", null],
  // Base card must NOT absorb its V variant (and the real Luxray LV.X still matches).
  ["Arceus V (083/100) (S9)", null],
  ["109/111 Luxray GL LV.X - Rare Holo", "luxray-lvx"],
  // Base card must NOT absorb its ex variant.
  ["Zekrom ex - SV: Black Bolt", null],
  // The genuine base Zekrom listing still matches.
  ["Zekrom 114/114 Black & White Holo", "zekrom-bw"],
];

let pass = 0;
for (const [title, want] of cases) {
  const got = resolve(title);
  const ok = got === want;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(title)}\n      got=${got} want=${want}`);
}
console.log(`\n${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
