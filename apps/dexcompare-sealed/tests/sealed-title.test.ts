// Real store titles (seen in the 2026-09-25 store probe) and what identify()
// must make of them. Wrong merges are the expensive failure, so most of these
// assert that two different products do NOT share a groupKey.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, detectSet, identify, isIdentity, floorCents } from "../src/lib/sealed-title";

function key(title: string, strict = false): string {
  const id = identify(title, { strict });
  return isIdentity(id) ? id.groupKey : `REJECT:${id}`;
}

test("set products group by set + type across store wordings", () => {
  const a = key("Pokémon TCG: Scarlet & Violet—Surging Sparks Elite Trainer Box");
  const b = key("Pokemon Surging Sparks ETB");
  const c = key("POKÉMON TCG Scarlet & Violet 8: Surging Sparks Elite Trainer Box (English)");
  assert.equal(a, "sv8|etb");
  assert.equal(b, a);
  assert.equal(c, a);
  assert.equal(key("Mega Evolution: Pitch Black - Booster Box"), "me5|booster-box");
  assert.equal(key("Pokemon TCG 30th Celebration Elite Trainer Box"), "cel30|etb");
  assert.equal(key("Pokemon TCG - Scarlet & Violet Booster Case"), "sv1|booster-box-case");
  assert.equal(key("Pokemon 151 Booster Bundle"), "sv3pt5|booster-bundle");
  assert.equal(key("Pokémon TCG: Prismatic Evolutions Pokémon Center Elite Trainer Box"), "sv8pt5|pc-etb");
});

test("a series name never stands in for an unknown set", () => {
  // If "Pitch Black" weren't in SETS this must be "no set", not Mega Evolution (me1).
  assert.equal(detectSet("Mega Evolution: Some Future Set - Booster Box"), null);
  assert.equal(detectSet("Pokémon Mega Evolution Elite Trainer Box")?.code, "me1");
  assert.equal(detectSet("Pokemon TCG ME01 Mega Evolution Booster Box")?.code, "me1");
  assert.equal(detectSet("Scarlet & Violet - Paldea Evolved Booster Box")?.code, "sv2");
  assert.equal(detectSet("Sword & Shield Evolving Skies Booster Box")?.code, "swsh7");
});

test("longest set name wins", () => {
  assert.equal(detectSet("Prismatic Evolutions Booster Bundle")?.code, "sv8pt5");
  assert.equal(detectSet("XY Evolutions Booster Box")?.code, "xy12");
  assert.equal(detectSet("Crown Zenith Galarian Gallery collection")?.code, "swsh12pt5");
});

test("151 is only the set when it isn't a card number or count", () => {
  assert.equal(detectSet("Pokemon 151 Elite Trainer Box")?.code, "sv3pt5");
  assert.equal(detectSet("Charizard ex 199/151")?.code ?? null, null);
  assert.equal(detectSet("Bulk lot 151 cards")?.code ?? null, null);
});

test("different collections, tins and blisters in one set never merge", () => {
  const tinA = key("Pokémon TCG: Paldean Fates Tin (Iron Treads)");
  const tinB = key("Pokémon TCG: Paldean Fates Tin (Great Tusk)");
  assert.notEqual(tinA, tinB);
  const premium = key("Pokémon TCG: Prismatic Evolutions Premium Figure Collection");
  const superPremium = key("Pokémon TCG: Prismatic Evolutions Super-Premium Collection");
  const binder = key("Prismatic Evolutions Binder Collection");
  assert.equal(new Set([premium, superPremium, binder]).size, 3);
  assert.notEqual(key("Charizard ex Premium Collection"), key("Charizard ex Super-Premium Collection"));
  assert.notEqual(key("Surging Sparks 3 Pack Blister (Zapdos)"), key("Surging Sparks Checklane Blister (Zapdos)"));
});

test("the same collection merges across wordings", () => {
  assert.equal(key("Pokémon TCG: Charizard ex Premium Collection"), key("Charizard EX Premium Collection Box - Pokemon"));
  assert.equal(key("Surging Sparks 3-Pack Blister - Zapdos"), key("Pokemon Surging Sparks 3 Pack Blister (Zapdos)"));
  assert.equal(key("Pokemon TCG Paldean Fates Tin - Iron Treads"), key("Pokémon TCG: Paldean Fates Tin (Iron Treads)"));
});

test("too-vague titles are refused rather than merged", () => {
  assert.equal(key("Pokemon TCG: 2-Pack Blister"), "REJECT:vague");
  assert.equal(key("Pokémon Mini Tin"), "REJECT:vague");
  assert.equal(key("Pokemon TCG - Checklane Blister"), "REJECT:vague");
});

test("singles, slabs, accessories, lots and store-made products are refused", () => {
  assert.equal(key("Charizard ex 223/197 Obsidian Flames"), "REJECT:not-sealed");
  assert.equal(key("PSA 10 Umbreon VMAX Evolving Skies"), "REJECT:not-sealed");
  assert.equal(key("Pokemon TCG Random Assorted 50-Card Value Lot - Bonus Holos"), "REJECT:not-sealed");
  assert.equal(key("ULTRA Pack - Pokemon 5-Card Hit Pack"), "REJECT:not-sealed");
  assert.equal(key("Surging Sparks Card Sleeves (65ct)"), "REJECT:accessory");
  assert.equal(key("Ultra Pro Pokémon Elite Trainer Box Acrylic Case"), "REJECT:accessory");
  assert.equal(key("Pokemon TCG - Sword & Shield - Vivid Voltage - Collectors Album"), "REJECT:accessory");
  assert.equal(key("3x Surging Sparks Elite Trainer Box"), "REJECT:multiple");
  assert.equal(key("Surging Sparks Booster Pack x5"), "REJECT:multiple");
  assert.equal(key("Empty Surging Sparks Elite Trainer Box"), "REJECT:not-sealed");
});

test("other languages are refused", () => {
  assert.equal(key("Japanese Pokémon Terastal Festival ex Booster Box"), "REJECT:foreign");
  assert.equal(key("Pokemon Surging Sparks Booster Box (JP)"), "REJECT:foreign");
  assert.equal(key("Pokémon Karmesin & Purpur Stürmische Funken Display (Deutsch)"), "REJECT:foreign");
  assert.equal(key("Pokemon Scarlet & Violet 151 Booster Box Chinese"), "REJECT:foreign");
  assert.equal(key("ポケモンカードゲーム テラスタルフェスex BOX"), "REJECT:foreign");
});

test("other games are refused, strictly in mixed collections", () => {
  assert.equal(key("One Piece OP-09 Emperors in the New World Booster Box", true), "REJECT:not-pokemon");
  assert.equal(key("Disney Lorcana Azurite Sea Booster Box"), "REJECT:not-pokemon");
  assert.equal(key("Riftbound: League of Legends Origins Booster Display"), "REJECT:not-pokemon");
  // A set name alone isn't enough in a store-wide pre-order collection.
  assert.equal(key("Surging Sparks Booster Box", true), "REJECT:not-pokemon");
  assert.equal(key("Pokemon Surging Sparks Booster Box", true), "sv8|booster-box");
});

test("wholesale displays and odd pack counts are not the set's booster box", () => {
  assert.equal(classify("Pokémon TCG Scarlet & Violet 151 Mini Tin Display"), null);
  assert.equal(classify("Pokemon Sleeved Booster Display (24)"), null);
  assert.equal(classify("Pokemon TCG ME01 Mega Evolution Enhanced Booster Box"), null);
  assert.equal(classify("Pokemon Pitch Black Half Booster Box"), null);
});

test("named boxes and calendars are collections", () => {
  assert.equal(classify("Pokemon TCG Crown Zenith - Morpeko V Union Box"), "collection");
  assert.equal(classify("POKÉMON TCG Holiday 2023 Calendar"), "collection");
  assert.equal(classify("Pokemon TCG - Sword & Shield Trainer Box"), "etb");
});

test("price floors scale per market", () => {
  assert.equal(floorCents("booster-box", "US"), 7000);
  assert.equal(floorCents("booster-box", "AU"), 10500);
  assert.ok(floorCents("booster-pack", "UK") < floorCents("booster-pack", "US"));
});

test("store wordings of the same blister merge; set codes and numerals are noise", () => {
  assert.equal(key("Scarlet & Violet 9: Journey Together Check Lane Blister (Pikachu)"), key("Journey Together Checklane Blister - Pikachu"));
  assert.equal(key("Mega Evolution ME06 - Delta Reign 3-Booster Blister"), key("Pokemon Delta Reign Three Booster Blister"));
  assert.equal(key("Mega Evolution - Chaos rising - 3 packs blister bundle"), key("Chaos Rising 3 Pack Blister"));
});

test("packaging words don't override the product's name", () => {
  assert.equal(classify("(SV4.5) Paldean Fates Tech Sticker Blister Collection"), "collection");
  assert.equal(key("(SV4.5) Paldean Fates Tech Sticker Blister Collection"), key("Paldean Fates Tech Sticker Collection"));
  assert.equal(classify("Mega Evolution ME02 - Phantasmal Flames - Sleeved Blister"), "sleeved-booster");
});

test("rarities and letter-prefixed card numbers are singles", () => {
  assert.equal(key("Flareon EX - RC6/RC32 - Ultra Rare - Generations Radiant Collection"), "REJECT:not-sealed");
  assert.equal(key("Umbreon VMAX TG23/TG30 Brilliant Stars"), "REJECT:not-sealed");
  assert.equal(key("XY - Mega Elite Trainer Deck Shield (Mega Gengar/Lucario)"), "REJECT:accessory");
});

test("collection names drop the series prefix stores add", () => {
  const id = identify("Mega Evolution - 30th Celebration - Tech Sticker Collection");
  assert.ok(isIdentity(id));
  assert.equal(id.name, "30th Celebration - Tech Sticker Collection");
  const b = identify("Pokémon TCG: Scarlet & Violet - Grand Adventure Collection");
  assert.ok(isIdentity(b));
  assert.equal(b.name, "Grand Adventure Collection");
  const c = identify("(SV4.5) Paldean Fates Tech Sticker Blister Collection");
  assert.ok(isIdentity(c));
  assert.equal(c.name, "Paldean Fates Tech Sticker Blister Collection");
});

test("EU stores' other-language editions are refused (titles from the 2026-09-25 probe)", () => {
  for (const t of [
    "Display Black Bolt - SV11B - Japonais",
    "Display Pokémon 151 - SV2A - Japonais",
    "Pokémon: White Flare (sv11W) Booster / Display (Koreanisch)",
    "Pokémon: Pikachu V-Union Box (Vereinfachtes Chinesisch)",
    "Pokémon: 30th Celebration (30th C) Booster / Display (Vereinfachtes Chinesisch)",
    "Pokemon ex Kampf Deck - Ampharos ex - Deutsches Sammelkartenspiel",
    "Pokémon Mega-Glurak X-ex Ultra-Premium-Kollektion",
    "151 Display 20 Buste (JAP)",
    // An English edition, but titled in Italian: its set can't be read, so it's
    // refused rather than guessed.
    "Avventure Insieme: Blister da 3 Buste Scrafty (ENG)",
    "151: Journey Slim Booster",
    "Pokemon Surging Sparks Elite Trainer Box VF",
  ]) {
    assert.equal(key(t), "REJECT:foreign", t);
  }
  // English editions in the same shops still pass.
  assert.equal(key("Pokémon: Pitch Black Booster Bundle (Englisch)"), "me5|booster-bundle");
  assert.equal(key("Paradox Rift Booster Pack"), "sv4|booster-pack");
  assert.equal(key("Pokemon Surging Sparks Display (EN)"), "sv8|booster-box");
});

test("store filler and English-edition markers don't split a product", () => {
  assert.equal(key("Pokemon Mega Charizard Tin (Englisch)"), key("Pokémon TCG: Mega Charizard Tin"));
  assert.equal(key("Mega Charizard Tin - Single"), key("Mega Charizard Tin"));
  assert.equal(key("Pokemon Mega Charizard Tin - Anglais"), key("Mega Charizard Tin"));
  assert.equal(key("Pokémon Collezione Coppia Mega Charizard (ITA)"), "REJECT:foreign");
  assert.equal(key("Pokémon Lata Mega Charizard ex"), "REJECT:foreign");
});

test("a series name followed by a set code is also dropped from names", () => {
  const id = identify("Mega Evolution ME03: Perfect Order Checklane - Makuhita");
  assert.ok(isIdentity(id));
  assert.equal(id.name, "Perfect Order Checklane - Makuhita");
});
