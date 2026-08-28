// Quick offline test for the One Piece title→card matcher (no DB / network needed):
//   npx tsx scripts/test-matcher.ts
import { buildCardResolver, MatchCard } from "../src/lib/price-import";

const cards: MatchCard[] = [
  { id: "luffy-op01", name: "Monkey D. Luffy", setName: "Romance Dawn", collectorNumber: "OP01-001" },
  { id: "law-op01", name: "Trafalgar Law", setName: "Romance Dawn", collectorNumber: "OP01-002" },
  { id: "zoro-op01", name: "Roronoa Zoro", setName: "Romance Dawn", collectorNumber: "OP01-025" },
  { id: "nami-op01", name: "Nami", setName: "Romance Dawn", collectorNumber: "OP01-016" },
  { id: "jinbe-op01", name: "Jinbe", setName: "Romance Dawn", collectorNumber: "OP01-013" },
  // Ace has TWO real printings — regression test for the old TOK_STOP bug that
  // stripped "ace" as noise (leftover from Pokémon's "Ace Spec Trainer" term),
  // which broke matching for every listing mentioning this character.
  { id: "ace-op02", name: "Portgas D. Ace", setName: "Paramount War", collectorNumber: "OP02-013" },
  { id: "ace-prb01", name: "Portgas D. Ace", setName: "Premium Booster -The Best-", collectorNumber: "PRB01-025" },
  // Cross-set number collision: same number (013) in a different set.
  { id: "decoy-op03", name: "Nico Robin", setName: "Pillars of Strength", collectorNumber: "OP03-013" },
];

const resolve = buildCardResolver(cards);

const cases: [string, string | null][] = [
  ["Monkey D. Luffy OP01-001 Leader Romance Dawn", "luffy-op01"],
  ["Trafalgar Law (OP01-002) Romance Dawn Leader", "law-op01"],
  ["Roronoa Zoro OP01-025 Super Rare Parallel", "zoro-op01"],
  ["Nami OP01-016 Rare NM", "nami-op01"],
  // Set code + number, no spelled-out set name at all.
  ["Jinbe OP01-013 SR", "jinbe-op01"],
  // The exact collision this fix targets: "Ace" must not be stripped as noise,
  // and the two printings must disambiguate by set code.
  ["Portgas D. Ace OP02-013 Super Rare Paramount War", "ace-op02"],
  ["Portgas D. Ace PRB01-025 Special Premium Booster", "ace-prb01"],
  // No recognisable set-code prefix in the title → falls back to name + set name.
  ["Portgas D. Ace - Paramount War - Parallel Art", "ace-op02"],
  // Bare number only, no set code: must require BOTH set name and full name.
  ["Nico Robin 013 Pillars of Strength Rare", "decoy-op03"],
  // Multi-card listing must NOT match a single card.
  ["Monkey D. Luffy OP01-001 PLAYSET x4", null],
  // Sealed product must NOT match a single card even though it has a number in it.
  ["One Piece OP01 Romance Dawn Booster Box", null],
  // Unknown card → null.
  ["Some Random Card OP99-999 Made Up Set", null],
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
