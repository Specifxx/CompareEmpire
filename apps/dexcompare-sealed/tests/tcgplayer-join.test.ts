// The TCGplayer join (2026-11-26): why a US product had no TCGplayer id, and the rules that fix it. Real titles from the
// 2026-11-26 data: store noise that split one product into many pages, a set named on one side only, a card sold as a pack.
import { test } from "node:test";
import assert from "node:assert/strict";
import { identify, isIdentity, type SealedIdentity } from "../src/lib/sealed-title";
import { tcgSetTwins, type TcgProduct } from "../src/lib/tcgplayer";
import { foldSetTwins, type ImportRow, type StoreRead } from "../src/lib/importer";
import { TCGPLAYER, type StoreConfig } from "../src/lib/stores";
import { mergedInto } from "../src/lib/focus";
import { tcgIdOfImage, tcgRows, type TcgMarketFile } from "../src/lib/tcg-market";

function key(title: string): string {
  const id = identify(title, { strict: false });
  return isIdentity(id) ? id.groupKey : `REJECT:${id}`;
}

test("store noise no longer splits a 30th Celebration product from TCGplayer's page", () => {
  const tin = key("30th Celebration Mini Tin [Zapdos]"); // TCGplayer's own title
  assert.equal(tin, "tin|cel30|mini-zapdos");
  for (const t of [
    "30th Celebration Mini Tin [Zapdos] [30C]",
    "30th Celebration (Anniversary) Mini Tins[Zapdos]",
    "30th Anniversary Celebration Mini-Tin: Zapdos",
    "30th Celebration Mini Tin [Zapdos] - ME: 30th Celebration (30C)",
  ])
    assert.equal(key(t), tin, t);
  const ditto = key("30th Celebration Ditto Premium Collection");
  for (const t of [
    "30th Celebration Ditto Premium Collection [30C]",
    "30th Celebration: Ditto - Premium Collection",
    "30th Celebration Ditto Premium Collection ( Late Nov)",
    "30th Celebration Ditto Premium Collection release novemeber 6",
    "CCG 30th Celebration Ditto Premium Collection",
  ])
    assert.equal(key(t), ditto, t);
  assert.equal(key("30th Celebration ex Tin [Sylveon ex] expected"), key("30th Celebration ex Tin [Sylveon ex] (Retail Version)"));
  assert.equal(key("30th Anniversary - Celebration Figure Collection (Mewtwo)"), key("30th Celebration Figure Collection [Mewtwo]"));
  assert.equal(key("Black Bolt & White Flare Unova Heavy Hitters Premium Collection Box release December 4, 2026"), key("Black Bolt & White Flare Unova Heavy Hitters Premium Collection Box"));
  assert.equal(key("Delta Reign 3 Pack Blister [Seel] (Unopened) ME06: Delta Reign Pokemon: 2026"), key("Delta Reign 3 Pack Blister [Seel]"));
});

test("an assorted listing stays the assorted listing: 'may vary' is the same as no art named, never one art", () => {
  assert.equal(key("151 Mini Tin (Styles May Vary)"), key("151 Mini Tin"));
  assert.notEqual(key("151 Mini Tin (Styles May Vary)"), key("151 Mini Tin [Gengar & Poliwag]"));
  // A count in brackets is not a set code: "[3PK]" and "(16Ct)" stay.
  assert.equal(key("Delta Reign Checklane Blister (16Ct)"), "blister|me6|16ct-checklane");
});

test("a Classic Collection card is a single card, never the Classic Collection pack or box", () => {
  for (const t of [
    "N (101) - ME: 30th Celebration Classic Collection (30C)",
    "Palkia LV.X - ME: 30th Celebration Classic Collection (30C)",
    "Lugia - ME: 30th Celebration Classic Collection - (149)",
    "_____'s Pikachu (24) [Celebrations: 25th Anniversary - Classic Collection]",
  ])
    assert.equal(key(t), "REJECT:not-sealed", t);
  assert.equal(key("30th Celebration Classic Collection Pack - ME: 30th Celebration"), "collection|cel30|classic");
  assert.equal(key("30th Celebration Classic Collection Pack [30C]"), "collection|cel30|classic");
  assert.equal(key("Pokemon TCG: Classic Collection Box"), "collection|-|classic");
});

test("'Prismatic Evolution' without the s is still the set; a Collector Chest is one product, tin or not", () => {
  assert.equal(key("Prismatic Evolution Super Premium Collection"), key("Prismatic Evolutions Super Premium Collection"));
  assert.equal(key("Prismatic Evolution - Mini Tin"), "tin|sv8pt5|mini");
  assert.equal(key("Collector Chest Tin - Fall 2024"), key("Collector Chest (Fall 2024)"));
  assert.notEqual(key("Collector Chest Tin - Fall 2024"), key("Collector Chest (Fall 2023)"));
});

const cat = (productId: number, productName: string, setName: string): TcgProduct => ({ productId, productName, setName, listings: [] });

test("tcgSetTwins: TCGplayer's set-less products with the one set TCGplayer files each under", () => {
  const twins = tcgSetTwins([
    cat(553000, "Kingambit Illustration Collection", "SV: Shrouded Fable"),
    cat(609597, "Blooming Waters Premium Collection", "SV: Scarlet & Violet 151"),
    cat(690660, "Mega Greninja ex Premium Collection", "Miscellaneous Cards & Products"), // no set: nothing to join
    // TCGplayer has both keys itself: two different products, never joined.
    cat(1, "Classic Collection", "Celebrations"),
    cat(2, "30th Celebration Classic Collection Pack", "ME: 30th Celebration"),
    cat(3, "Celebrations Classic Collection", "Celebrations"),
  ]);
  assert.equal(twins.get("collection|-|illustration-kingambit")?.set, "sv6pt5");
  assert.equal(twins.get("collection|-|blooming-waters")?.set, "sv3pt5");
  assert.equal(twins.has(key("Mega Greninja ex Premium Collection")), false);
  assert.equal(twins.has("collection|-|classic"), false);
  // Two catalogue products on one set-less key in two sets: not certain, no twin.
  const two = tcgSetTwins([cat(1, "Pikachu V Box", "Shining Fates"), cat(2, "Pikachu V Box", "Miscellaneous Cards & Products")]);
  assert.equal(two.size, 0);
  assert.equal(tcgSetTwins([cat(1, "Pikachu V Box", "SWSH: Shining Fates"), cat(2, "Pikachu V Box", "SWSH: Vivid Voltage")]).size, 0);
});

const shop: StoreConfig = { key: "s1", name: "Store One", base: "https://s1.example", market: "US", platform: "shopify", country: "US", collections: ["pokemon"] };
function row(title: string, priceCents: number, inStock = true): ImportRow {
  const identity = identify(title, { strict: false }) as SealedIdentity;
  return { identity, title, url: `https://x/${encodeURIComponent(title)}`, priceCents, inStock, imageUrl: null };
}

test("foldSetTwins files the stores' rows on TCGplayer's key, and only where TCGplayer vouches for the set", () => {
  const catalogue = [cat(553000, "Kingambit Illustration Collection", "SV: Shrouded Fable")];
  const tcg: StoreRead = {
    store: TCGPLAYER, ok: true, error: null, products: 1, rediscovered: false, ms: 0,
    rows: [row("Kingambit Illustration Collection", 2999)],
    setTwins: tcgSetTwins(catalogue),
  };
  const s: StoreRead = {
    store: shop, ok: true, error: null, products: 3, rediscovered: false, ms: 0,
    rows: [
      row("Shrouded Fable - Illustration Collection - Kingambit", 3499),
      row("Kingambit Illustration Collection", 3299, false), // the same store, both wordings: the better row stays
      row("Twilight Masquerade - Illustration Collection - Kingambit", 3999), // another set: not TCGplayer's product
    ],
  };
  assert.equal(foldSetTwins([tcg, s]), 1);
  const keys = s.rows.map((r) => r.identity.groupKey).sort();
  assert.deepEqual(keys, ["collection|-|illustration-kingambit", "collection|sv6|illustration-kingambit"]);
  assert.equal(s.rows.find((r) => r.identity.groupKey === "collection|-|illustration-kingambit")!.priceCents, 3499);
  // Without a TCGplayer read nothing moves.
  const alone: StoreRead = { ...s, rows: [row("Shrouded Fable - Illustration Collection - Kingambit", 3499)] };
  assert.equal(foldSetTwins([alone]), 0);
  assert.equal(alone.rows[0].identity.groupKey, "collection|sv6pt5|illustration-kingambit");
});

test("a culled page whose listings moved goes to the page they moved to", () => {
  const products = [
    { id: "a", slug: "zapdos", groupKey: "tin|cel30|mini-zapdos", name: "30th Celebration Mini Tin [Zapdos]" },
    { id: "b", slug: "zapdos-30c", groupKey: "tin|cel30|30c-mini-zapdos", name: "30th Celebration Mini Tin [Zapdos] [30C]" },
    { id: "c", slug: "kingambit", groupKey: "collection|-|illustration-kingambit", name: "Kingambit Illustration Collection" },
    { id: "d", slug: "sf-kingambit", groupKey: "collection|sv6pt5|illustration-kingambit", name: "Shrouded Fable - Illustration Collection - Kingambit" },
    { id: "e", slug: "pikachu-v-sf", groupKey: "collection|swsh45|pikachu-v", name: "Shining Fates Pikachu V Box" },
    { id: "f", slug: "pikachu-v", groupKey: "collection|-|pikachu-v", name: "Pikachu V Box" },
  ];
  const keep = new Set(["a", "c", "f"]);
  // e still has a listing: a set's own product, never sent to the set-less one.
  const merged = mergedInto(products, [{ productId: "a" }, { productId: "c" }, { productId: "e" }, { productId: "f" }], keep);
  assert.deepEqual(merged, { "zapdos-30c": "zapdos", "sf-kingambit": "kingambit" });
});

test("the TCGplayer history line also reads a product's TCGplayer photo when TCGplayer has no seller today", () => {
  assert.equal(tcgIdOfImage("https://tcgplayer-cdn.tcgplayer.com/product/704181_in_1000x1000.jpg"), "704181");
  assert.equal(tcgIdOfImage("https://cdn.shopify.com/s/files/704181_in_1000x1000.jpg"), null);
  const file: TcgMarketFile = { day: 100, fx: { USD: 1 }, prices: { "704181": 2500, "1": 900 } };
  const rows = tcgRows(
    [
      { id: "a", slug: "photo-only", imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/704181_in_1000x1000.jpg" },
      { id: "b", slug: "offer-wins", imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/704181_in_1000x1000.jpg" },
      { id: "c", slug: "store-photo", imageUrl: "https://cdn.shopify.com/x.jpg" },
    ],
    [{ productId: "b", store: "tcgplayer", url: "https://www.tcgplayer.com/product/1/x" }],
    file,
    100,
  );
  assert.deepEqual(rows.map((r) => [r.slug, r.cents]), [["photo-only", 2500], ["offer-wins", 900]]);
});
