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
  // Wrong set name should not steal a same-numbered card.
  ["Some Random Card 125/182 Paradox Rift", "decoy-other"],
  // Unknown card → null.
  ["Snorlax 999/999 Made Up Set", null],
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
