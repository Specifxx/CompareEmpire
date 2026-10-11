import { test } from "node:test";
import assert from "node:assert/strict";
import { refusedForType, refusedListing } from "../src/lib/ebay-rules";
import type { TypeKey } from "../src/lib/sealed-title";

// Real titles from the live price rows (2026-10-11): the product's eBay listings sit at the TOP of its price list, lowest price
// first, so a part, a promo card or the wrong variant would lead the page. Each must be refused for that product, and the
// ordinary sealed listings beside them kept.
const refused = (t: string, type: TypeKey) => refusedListing(t) || refusedForType(t, type);

test("refused: a product's contents, a single card or promo, parts-only, a non-Pokémon-Center ETB on a Pokémon Center page, one item 'w/ case' on a case page", () => {
  for (const [t, type] of [
    ["3 Promo Sealed Pokemon 30th Anniversary Energy Packs From Elite Trainer Box", "etb"],
    ["Pokemon 151 Poster From Poster Collection Box (Poster Only) NEW!", "collection"],
    ["Pokémon TCG Snorlax 051 Scarlet & Violet 151 Elite Trainer Box Promo Sealed", "etb"],
    ["Charizard ex 199/165 Pokemon 151 Elite Trainer Box", "etb"],
    ["Pokemon 151 Elite Trainer Box Sealed, Non-Pokemon Center, Pristine", "pc-etb"],
    ["151 ETB SEALED w/ case pokemon TCG Scarlet & Violet 151 Elite Trainer Box", "etb-case"],
    ["Pokemon Surging Sparks Booster Box with acrylic case", "booster-box-case"],
    ["Pokemon Prismatic Evolutions Sleeves Only from Elite Trainer Box", "etb"],
  ] as [string, TypeKey][])
    assert.ok(refused(t, type), `${type}: ${t}`);
});

test("kept: the ordinary sealed listings next to them (shipping 'from', a regular ETB that says non-PC, a real case, a promo the product includes)", () => {
  for (const [t, type] of [
    ["Pokemon 151 Elite Trainer Box Sealed, Non-Pokemon Center, Pristine", "etb"],
    ["151 ETB SEALED w/ case pokemon TCG Scarlet & Violet 151 Elite Trainer Box", "etb"],
    ["Pokemon Scarlet & Violet 151 Elite Trainer Box Case 10 ETBs Factory Sealed", "etb-case"],
    ["Pokemon 30th Celebration Elite Trainer Box Sealed - Ships From USA", "etb"],
    ["Pokemon Pitch Black Booster Box 36 Packs Sealed Ships from Pokemon Center", "booster-box"],
    ["Pokemon Paldean Fates Tin Charizard ex Promo Card Sealed", "tin"],
    ["Pokemon TCG 151 Ultra Premium Collection UPC Factory Sealed", "upc"],
    ["Pokemon TCG: Scarlet & Violet 151 Zapdos EX Collection Box New & Sealed", "collection"],
    ["Pokémon TCG Scarlet & Violet 151 Mini Tin Gengar & Poliwag", "tin"],
    ["Pokemon 151 Binder Collection New Factory Sealed", "collection"],
  ] as [string, TypeKey][])
    assert.ok(!refused(t, type), `${type}: ${t}`);
});
