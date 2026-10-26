// The Japanese section (src/lib/sets-ja.ts, sealed-title.ts identifyJapanese): real store, eBay and TCGplayer titles and what
// they must become. As with identify(), a wrong merge is the expensive failure: a Korean, Chinese or English box must never share
// a page (or a price) with a Japanese one, and a title that does not name one Japanese set is refused, never guessed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ebaySearchUrl, PLACEMENTS, tcgplayerSearchUrl } from "../src/lib/affiliate";
import { AMAZON_PLACEMENTS } from "../src/lib/amazon";
import { canonicalName, identify, identifyAny, identifyJapanese, isIdentity, JAPANESE_TYPES, PRODUCT_TYPES, TYPE_BY_KEY, TYPE_BY_SLUG } from "../src/lib/sealed-title";
import { displayCode, JA_SET_BY_SET_CODE, JA_SETS, jaSetCode, jaSetOf } from "../src/lib/sets-ja";
import { SETS } from "../src/lib/sets";
import { regionSitemap } from "../src/lib/sitemap";
import { REGION_LIST } from "../src/lib/regions";
import { JAPANESE_LINE, tcgFeedProducts, tcgJapaneseTitle } from "../src/lib/tcgplayer";

function key(title: string): string {
  const id = identifyAny(title);
  return isIdentity(id) ? id.groupKey : `REJECT:${id}`;
}

test("Japanese titles: the set by its English name or its code, a box or a pack, one key whatever the wording", () => {
  // Store titles (Beaches TCG, 2026-10-19; Australian and US Shopify stores, 2026-10-26) and eBay titles.
  const cases: [string, string][] = [
    ["Terastal Festival EX Sv8a Booster Box ⚡️ Japanese", "ja-sv8a|jp-booster-box"],
    ["Terastal Festival ex JPN - Booster Box", "ja-sv8a|jp-booster-box"],
    ["Terastal Festival ex JPN - Booster Pack", "ja-sv8a|jp-booster-pack"],
    ["Pokemon TCG MEGA JPN: MEGA Dream ex Booster Box", "ja-m2a|jp-booster-box"],
    ["Mega Dream Booster box  Japanese", "ja-m2a|jp-booster-box"],
    ["[Japanese Version] Pokemon Card Game Sword & Shield Eevee Heroes Booster Box", "ja-s6a|jp-booster-box"],
    ["Battle Partners Boosterbox (Japans)", "ja-sv9|jp-booster-box"],
    ["mega brave Japanese booster box", "ja-m1l|jp-booster-box"],
    ["Mega Brave JPN - Booster Pack", "ja-m1l|jp-booster-pack"],
    ["Ninja Spinner Booster Box Japanese", "ja-m4|jp-booster-box"],
    ["Nihil Zero JPN - Booster Pack", "ja-m3|jp-booster-pack"],
    ["Mega Symphonia JPN - Booster Pack", "ja-m1s|jp-booster-pack"],
    ["Inferno X JPN - Booster Pack", "ja-m2|jp-booster-pack"],
    ["Lost abyss Japanese booster pack", "ja-s11|jp-booster-pack"],
    ["Stella miracle Japanese pack", "ja-sv7|jp-booster-pack"],
    ["Pokemon Card Game Scarlet & Violet Booster Box 151 sv2a Japanese", "ja-sv2a|jp-booster-box"],
    ["Pokemon Japanese Paradise Dragona Booster Box SV7a", "ja-sv7a|jp-booster-box"],
    ["Japanese Shiny Treasure ex Booster Box sv4a", "ja-sv4a|jp-booster-box"],
    ["Pokemon Japanese VMAX Climax Booster Box s8b", "ja-s8b|jp-booster-box"],
    ["Pokemon Japanese Night Wanderer Booster Box SV6a", "ja-sv6a|jp-booster-box"],
    ["Pokemon Japanese Super Electric Breaker Booster Box", "ja-sv8|jp-booster-box"],
  ];
  for (const [title, want] of cases) assert.equal(key(title), want, title);
  // The English classifier never files a Japanese title: identifyAny tries the Japanese section only after identify() said "foreign".
  assert.equal(identify("Terastal Festival ex JPN - Booster Box"), "foreign");
  assert.equal(key("Pokemon Surging Sparks Booster Box"), "sv8|booster-box");
});

test("Japanese titles: refused rather than guessed", () => {
  const cases: [string, string][] = [
    // other Asian editions share the set names and codes
    ["Pokemon Card Game Korean 151 Booster Box", "REJECT:foreign"],
    ["Pokemon Simplified Chinese 151 Booster Box", "REJECT:foreign"],
    ["Pokemon Chinese Gem Pack Vol 3", "REJECT:foreign"],
    // no language marker: the English classifier's answer stands
    ["Pokemon Ninja Spinner booster pack", "REJECT:no-set"],
    // an English set's name with "Japanese": no Japanese set is called that
    ["Pokemon Japanese Booster Box Surging Sparks", "REJECT:no-set"],
    // a code and a name that disagree (SV11B is Black Bolt; White Flare is SV11W)
    ["Pokemon Japanese Black Bolt & White Flare Booster Box", "REJECT:vague"],
    // lots, cases, opened boxes and the Pokémon Center's own boxes are not one Japanese booster box
    ["Pokemon Japanese MEGA Dream ex M2a Booster Box 8x Lot", "REJECT:multiple"],
    ["Pokemon Japanese Terastal Festival ex Booster Box Case (12 boxes)", "REJECT:unclassified"],
    ["Pokemon Japanese Battle Partners Booster Box Pokemon Center Exclusive", "REJECT:unclassified"],
    ["Pokemon Center Tokyo special box Japanese", "REJECT:unclassified"],
    ["Japanese Terastal Festival ex Booster Box No Shrink", "REJECT:not-sealed"],
    // too garbled to name a product
    ["nahil zero Booste box Japanese", "REJECT:unclassified"],
  ];
  for (const [title, want] of cases) assert.equal(key(title), want, title);
  const id = identifyJapanese("Pokemon Japanese Black Bolt Booster Box sv11b");
  assert.ok(isIdentity(id) && id.groupKey === "ja-sv11b|jp-booster-box");
});

test("Japanese products: a fixed name, the Japanese set and its own types, kept out of the English lists", () => {
  const id = identifyAny("Terastal Festival EX Sv8a Booster Box ⚡️ Japanese");
  assert.ok(isIdentity(id));
  assert.equal(id.name, "Terastal Festival ex Japanese Booster Box (SV8a)");
  assert.equal(id.setCode, "ja-sv8a");
  assert.equal(id.jaSet?.code, "sv8a");
  assert.equal(id.type, "jp-booster-box");
  assert.equal(id.typeLabel, "Japanese Booster Box");
  assert.equal(id.set, null, "never an English set");
  assert.equal(canonicalName("ja-sv2a|jp-booster-box"), "Pokémon Card 151 Japanese Booster Box (SV2a)");
  assert.equal(canonicalName("ja-s8b|jp-booster-pack"), "VMAX Climax Japanese Booster Pack (S8b)");
  assert.deepEqual(JAPANESE_TYPES.map((t) => t.slug), ["japanese-booster-boxes", "japanese-booster-packs"]);
  for (const t of JAPANESE_TYPES) {
    assert.ok(!PRODUCT_TYPES.includes(t), `${t.slug}: not an English type (pack counts, MSRP, guides)`);
    assert.equal(TYPE_BY_KEY.get(t.key), t);
    assert.equal(TYPE_BY_SLUG.get(t.slug), t);
  }
});

test("JA_SETS: unique codes and slugs, newest first, real dates or none, never an English set code", () => {
  const codes = new Set(JA_SETS.map((s) => s.code));
  assert.equal(codes.size, JA_SETS.length);
  assert.equal(new Set(JA_SETS.map((s) => s.slug)).size, JA_SETS.length);
  const english = new Set(SETS.map((s) => s.code));
  for (const s of JA_SETS) {
    assert.match(s.code, /^(?:m|sv|s)\d{1,2}[a-z]?$/, s.code);
    assert.ok(!english.has(jaSetCode(s)), `${s.code}: its setCode never collides with an English one`);
    assert.equal(jaSetOf(jaSetCode(s)), s);
    assert.equal(JA_SET_BY_SET_CODE.get(jaSetCode(s)), s);
    if (s.releaseDate) assert.match(s.releaseDate, /^\d{4}-\d{2}-\d{2}$/, s.code);
  }
  const dated = JA_SETS.filter((s) => s.releaseDate);
  for (let i = 1; i < dated.length; i++) assert.ok(dated[i - 1].releaseDate! >= dated[i].releaseDate!, `${dated[i].code}: newest first`);
  assert.equal(jaSetOf("sv8"), null, "an English set code is not a Japanese set");
  assert.deepEqual(["sv8a", "sv11b", "m1l", "s8b", "s10d"].map((c) => displayCode(JA_SETS.find((s) => s.code === c)!)), ["SV8a", "SV11B", "M1L", "S8b", "S10D"]);
});

test("TCGplayer's Japanese line: its titles identify, and a Japanese product's buttons search that line", () => {
  assert.equal(JAPANESE_LINE.productLineName, "pokemon-japan");
  assert.equal(tcgJapaneseTitle({ setName: "SV8a: Terastal Fest ex", productName: "Terastal Fest ex Booster Box" }), "Japanese SV8a: Terastal Fest ex Terastal Fest ex Booster Box");
  assert.equal(key(tcgJapaneseTitle({ setName: "SV8a: Terastal Fest ex", productName: "Terastal Fest ex Booster Box" })), "ja-sv8a|jp-booster-box");
  assert.equal(key(tcgJapaneseTitle({ setName: "SV2a: Pokemon Card 151", productName: "Pokemon Card 151 Booster Box" })), "ja-sv2a|jp-booster-box");
  assert.equal(key(tcgJapaneseTitle({ setName: "M2a: MEGA Dream ex", productName: "MEGA Dream ex Booster Pack" })), "ja-m2a|jp-booster-pack");
  const feed = tcgFeedProducts(
    [{ productId: 1, productName: "Terastal Fest ex Booster Box", setName: "SV8a: Terastal Fest ex", marketPrice: 120, listings: [{ price: 118, quantity: 2, condition: "Unopened", language: "Japanese", listingType: "standard" }] },
      // an English listing on the Japanese line is not the Japanese product's price
      { productId: 2, productName: "Pokemon Card 151 Booster Box", setName: "SV2a: Pokemon Card 151", marketPrice: 150, listings: [{ price: 140, quantity: 1, language: "English", languageId: 1, listingType: "standard" }] },
    ],
    JAPANESE_LINE,
  );
  assert.equal(feed.length, 1);
  assert.match(feed[0].title, /^Japanese /);

  const jp = new URL(new URL(tcgplayerSearchUrl("Terastal Festival ex Japanese Booster Box (SV8a)", "us", "product-table")).searchParams.get("u")!);
  assert.equal(jp.pathname, "/search/pokemon-japan/product");
  assert.equal(jp.searchParams.get("productLineName"), "pokemon-japan");
  assert.equal(jp.searchParams.get("q"), "Terastal Festival ex Booster Box", "no 'Japanese', no code in brackets");
  const en = new URL(new URL(tcgplayerSearchUrl("Pitch Black Booster Box", "us", "product-table")).searchParams.get("u")!);
  assert.equal(en.pathname, "/search/pokemon/product", "an English product keeps the English line");
  assert.equal(new URL(tcgplayerSearchUrl("Japanese Booster Box", "us", "japanese-tcgplayer")).searchParams.get("sharedid"), "dex-us-japanese-tcgplayer");
});

test("the Japanese section's links and sitemap: its own placements, and the hub only where a store lists one", () => {
  for (const p of ["listings-japanese", "japanese-tcgplayer"]) assert.ok((PLACEMENTS as readonly string[]).includes(p), p);
  assert.ok((AMAZON_PLACEMENTS as readonly string[]).includes("amazon-japanese"));
  const q = new URL(ebaySearchUrl("Pokemon Terastal Festival ex Japanese Booster Box sealed", "us", "listings-japanese"));
  assert.equal(q.searchParams.get("campid"), "5339155912");
  const us = REGION_LIST.find((r) => r.region === "us")!;
  const none = regionSitemap(us, { typeLabels: ["Booster Box"], setCodes: [], productSlugs: [], lastmod: null }).map((u) => u.url);
  assert.ok(!none.some((u) => u.endsWith("/us/japanese")));
  const some = regionSitemap(us, { typeLabels: ["Japanese Booster Box"], setCodes: [], productSlugs: [], lastmod: null }).map((u) => u.url);
  assert.ok(some.some((u) => u.endsWith("/us/japanese")));
  assert.ok(some.some((u) => u.endsWith("/us/type/japanese-booster-boxes")));
  assert.ok(!some.some((u) => u.endsWith("/us/type/japanese-booster-packs")));
});
