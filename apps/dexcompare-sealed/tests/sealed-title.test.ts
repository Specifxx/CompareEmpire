// Real store titles (seen in the 2026-09-25 store probe) and what identify()
// must make of them. Wrong merges are the expensive failure, so most of these
// assert that two different products do NOT share a groupKey.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, cleanName, detectSet, identify, isIdentity, floorCents } from "../src/lib/sealed-title";

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

// ── TCGplayer's catalogue names (2026-09-27), and the store titles for the same
// products. Each of these was filed on the wrong product before.

test("ETB Plus and cases of Pokémon Center ETBs are not the plain ETB or its case", () => {
  assert.equal(key("Sword & Shield Elite Trainer Box Plus [Zamazenta]"), "REJECT:unclassified");
  assert.equal(key("Crown Zenith Pokemon Center Elite Trainer Box Plus"), "REJECT:unclassified");
  assert.equal(key("Surging Sparks Pokemon Center Elite Trainer Box (Exclusive) Case"), "REJECT:unclassified");
  assert.equal(key("Pokemon Go Pokemon Center Elite Trainer Box Plus Case (Exclusive)"), "REJECT:unclassified");
  assert.equal(key("Surging Sparks Elite Trainer Box Case"), "sv8|etb-case");
  assert.equal(key("Sword & Shield Elite Trainer Box [Zamazenta]"), "swsh1|etb");
});

test("displays of booster bundles and master cartons are not the bundle or its case", () => {
  assert.equal(key("Black Bolt Booster Bundle Display"), "REJECT:unclassified");
  assert.equal(key("151 Booster Bundle Display Case"), "REJECT:unclassified");
  assert.equal(key("Pokémon TCG - Display booster bundle Destined Rivals (ingles)"), "REJECT:unclassified");
  assert.equal(key("Stellar Crown Sleeved Booster Master Carton"), "REJECT:unclassified");
  assert.equal(key("POKEMON TCG - SCARLET VIOLET 151 BOOSTER BUNDLE CASE (10 BUNDLES) SEALED DISPLAY"), "sv3pt5|booster-bundle-case");
  assert.equal(key("Black Bolt Booster Bundle"), "zsv10pt5|booster-bundle");
});

test("fun packs, mini packs and promo packs are not the set's booster pack", () => {
  assert.equal(key("Destined Rivals Fun Pack"), "REJECT:unclassified");
  assert.equal(key("Unified Minds Mini Pack"), "REJECT:unclassified");
  assert.equal(key("Team Up - Mini Booster Pack"), "REJECT:unclassified");
  assert.equal(key("McDonald's 25th Anniversary Booster Pack"), "REJECT:unclassified");
  assert.equal(key("General Mills 25th Anniversary Booster Pack"), "REJECT:unclassified");
  assert.equal(key("Detective Pikachu Special Promo Booster Pack"), "REJECT:unclassified");
  assert.equal(key("POP Series 3 Pack"), "REJECT:unclassified");
  assert.equal(key("Celebrations Booster Pack"), "cel25|booster-pack");
  // "Base Set 2" is a set, not a 2-pack blister.
  assert.equal(classify("Base Set 2 Booster Pack"), "booster-pack");
});

test("displays and multiples in TCGplayer's wording are refused", () => {
  assert.equal(key("Stellar Crown Build & Battle Box [Set of 10]"), "REJECT:multiple");
  assert.equal(key("Paldea Legends Tins [Bundle of 2] (International Version)"), "REJECT:multiple");
  assert.equal(key("Kanto Friends Mini Tins 5-Pack"), "REJECT:multiple");
  assert.equal(key("Sam's Club 151 (4 Mini Tins + 4 Promo Cards Bundle)"), "REJECT:multiple");
  assert.equal(key("Pokémon - Paldean Fates 5 Mini Tins"), "REJECT:multiple");
  assert.equal(key("V Battle Deck Display [Venusaur V/Blastoise V]"), "REJECT:unclassified");
  assert.equal(key("Team Up Prerelease Kit Display"), "REJECT:unclassified");
  assert.equal(key("2024 World Championships Deck Display"), "REJECT:unclassified");
  // One mini tin still identifies.
  assert.equal(key("Kanto Friends Mini Tin"), "tin|-|friends-kanto-mini");
});

test("a retailer's edition or bundle of a set product is not the product", () => {
  assert.equal(key("Prismatic Evolutions Elite Trainer Box and Pokeball (Sam's Club)"), "REJECT:retail-edition");
  assert.equal(key("Prismatic Evolutions Elite Trainer Box (Dollar General Exclusive)"), "REJECT:retail-edition");
  assert.equal(key("Costco Pokemon Collector 3-Pack: Scarlet & Violet 151 ETB + Paldea Legends Tins"), "REJECT:retail-edition");
  assert.equal(key("Costco Pokemon Surging Sparks 2-Pack Trainer Box and Booster Bundle"), "REJECT:unclassified");
  assert.equal(key("Surging Sparks Elite Trainer Box and Booster Bundle"), "REJECT:unclassified");
  // A retailer-exclusive collection or blister is its own product: its name says which.
  assert.notEqual(
    key("Pitch Black Premium Checklane Blister [Tyrunt, Tyrantrum] (Target Exclusive)"),
    key("Pitch Black Premium Checklane Blister [Amaura, Aurorus] (Target Exclusive)"),
  );
  assert.ok(!key("Pitch Black Premium Checklane Blister [Tyrunt, Tyrantrum] (Target Exclusive)").startsWith("REJECT"));
});

test("single-pack, 2-pack and 3-pack blisters of one Pokémon are three products", () => {
  const three = key("Obsidian Flames 3 Pack Blister [Houndstone]");
  const single = key("Obsidian Flames Single Blister Pack [Houndstone]");
  assert.notEqual(three, single);
  assert.equal(single, key("Pokemon Obsidian Flames Single Pack Blister (Houndstone)"));
  assert.equal(three, key("Obsidian Flames Blister (Houndstone)")); // three is the default
  assert.notEqual(key("2-Pack Blister [Zarude]"), key("3 Pack Blister [Zarude]"));
  assert.equal(key("Collector's Pin Two Pack Blisters [Jirachi]"), key("2 Booster Packs & Jirachi Collector's Pin"));
  assert.equal(key("Pokemon TCG: 2-Pack Blister"), "REJECT:vague");
});

test("numbered series, Mega Y and Special Collections are part of a product's identity", () => {
  const s1 = key("First Partner Illustration Collection (Series 1)");
  assert.notEqual(s1, key("First Partner Illustration Collection (Series 2)"));
  assert.equal(key("First Partner Illustration Collection (Series 2)"), key("Pokémon TCG - First Partner Illustration Collection Series 2"));
  assert.notEqual(key("Mega Charizard X Collection"), key("Mega Charizard Y Collection"));
  assert.notEqual(key("Mega Charizard Tin (Mega Charizard Y)"), key("Mega Charizard Tin (Mega Charizard X)"));
  assert.equal(key("Mega Charizard Tin (Mega Charizard X)"), key("Pokemon Mega Charizard X Tin"));
  // X stays the unmarked form, so the one Ultra-Premium Collection keeps one key.
  assert.equal(key("Mega Charizard X ex Ultra Premium Collection"), key("Mega Charizard ex Ultra-Premium Collection"));
  assert.notEqual(key("Charizard ex Special Collection"), key("Charizard ex Premium Collection"));
  assert.equal(key("Charizard ex Premium Collection"), key("Pokemon Charizard EX Premium Collection Box"));
  assert.equal(key("Lucario VSTAR Special Collection"), key("Pokemon: Lucario VStar Special Collection Box"));
  assert.equal(key("Pokemon Special Collection"), "REJECT:vague");
});

test("a Pokémon Center ETB named with a series-named set finds its set", () => {
  assert.equal(key("Mega Evolution Pokemon Center Elite Trainer Box (Exclusive) [Mega Gardevoir]"), "me1|pc-etb");
  assert.equal(key("Mega Evolution - Elite Trainer Box (Mega Gardevoir) (Pokemon Center Exclusive)"), "me1|pc-etb");
  assert.equal(key("Scarlet & Violet Pokemon Center Elite Trainer Box (Exclusive) [Koraidon]"), "sv1|pc-etb");
});

test("'Special Collection' is only identity for the Pokémon sold as both a Special and a Premium Collection", () => {
  // Most Special Collections are also listed without the word: one product.
  assert.equal(key("Zacian V-Union Box"), key("Zacian V-UNION Special Collection"));
  assert.equal(key("Prismatic Evolutions Accessory Pouch Collection"), key("Prismatic Evolutions Accessory Pouch Special Collection"));
  assert.equal(key("Celebrations Collection [Pikachu V-UNION]"), key("Celebrations Special Collection Pikachu V-UNION"));
  assert.equal(key("V-union Box - Morpeko"), key("Morpeko V-UNION Special Collection"));
  // Both exist, at different prices, for these (TCGplayer lists both of each).
  assert.notEqual(key("Kleavor VSTAR Special Collection"), key("Kleavor VSTAR Premium Collection"));
  assert.notEqual(key("Pikachu VMAX Special Collection"), key("Pikachu VMAX Premium Collection"));
  assert.notEqual(key("Lucario VSTAR Special Collection"), key("Lucario VSTAR Premium Collection"));
});

test("the Mega Y marker: only a Charizard or Mewtwo title that names no X", () => {
  const y = key("Mega Charizard Tin (Mega Charizard Y)");
  // The assorted listing is not the Y product.
  for (const t of ["Mega Charizard X & Y Tin", "Mega Charizard X/Y Tin", "Mega Charizard Tin (X & Y Assorted)", "Mega Charizard Y/X Tin", "Mega Charizard X OR Y Tin"]) {
    assert.notEqual(key(t), y, t);
  }
  assert.equal(key("XY Furious Fists Premium Collection Mega Charizard Y"), key("Furious Fists Premium Collection (Mega Charizard Y)"));
  // The "X & Y" series and the Spanish "y" are not the Y form.
  assert.equal(key("X & Y - Kangaskhan EX Box"), key("Kangaskhan EX Box"));
  assert.equal(key("Cyrus y Klara Premium Tournament Collection"), key("Klara & Cyrus Premium Tournament Collection"));
});

test("pack counts in either word order: 'Blister Pack - Single Booster', 'Two-Booster Blister'", () => {
  assert.equal(key("Surging Sparks - Blister Pack - Single Booster - Wooper"), key("Surging Sparks Single Pack Blister [Wooper]"));
  assert.equal(key("Journey Together - Blister Pack - Single Booster - Scraggy Promo Card"), key("Journey Together Single Pack Blister [Scraggy]"));
  assert.equal(key("Prismatic Evolutions Two-Booster Blister"), key("Prismatic Evolutions 2 Pack Blister"));
  assert.notEqual(key("Prismatic Evolutions Two-Booster Blister"), key("Prismatic Evolutions 3 Pack Blister"));
  // A checklane is single-pack by definition and keeps its own key.
  assert.equal(key("Surging Sparks Checklane Blister [Pikachu]"), "blister|sv8|checklane-pikachu");
});

test("'Pokémon Center' names a set's product only as a Pokémon Center ETB", () => {
  assert.equal(detectSet("Scarlet & Violet – Pokémon Center Hiroshima Special Box (289/260/261/SV-P)"), null);
  assert.equal(key("Scarlet & Violet Pokemon Center Elite Trainer Box"), "sv1|pc-etb");
});

test("'30th Celebrations' is the 30th Celebration set, never Celebrations (2021)", () => {
  assert.equal(detectSet("Pokémon TCG: 30th Celebrations Elite Trainer Box")?.code, "cel30");
  assert.equal(key("Pokemon: 30th Celebrations Elite Trainer Box"), key("30th Celebration Elite Trainer Box"));
  assert.equal(key("Pokémon 30th Celebrations Poster Collection"), key("Pokémon TCG - Mega Evolution - 30th Celebration - Poster Collection"));
  assert.equal(key("BLISTER 2 BOOSTER PACK 30TH CELEBRATIONS POKEMON"), "blister|cel30|2pack");
  assert.equal(key("Pokemon Celebrations Elite Trainer Box"), "cel25|etb");
});

test("product names keep 'Unlimited' and 'Metal'; bracketed store notes go", () => {
  assert.equal(cleanName("Neo Discovery 2-Pack Blister [Unlimited Edition]"), "Neo Discovery 2-Pack Blister [Unlimited Edition]");
  assert.equal(cleanName("Charizard Tin (Metal Coin)"), "Charizard Tin (Metal Coin)");
  assert.equal(cleanName("Sylveon ex Box (Limit 2)"), "Sylveon ex Box");
  assert.equal(cleanName("Espeon & Umbreon Premium Deck Set (One Per Customer)"), "Espeon & Umbreon Premium Deck Set");
});
