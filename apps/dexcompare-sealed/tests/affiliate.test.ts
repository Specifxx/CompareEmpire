import { test } from "node:test";
import assert from "node:assert/strict";
import {
  affiliateSubId,
  EBAY_CAMPAIGN_ID,
  ebayLabel,
  ebayRetailer,
  ebaySearchUrl,
  offerLink,
  offerRetailer,
  PLACEMENTS,
  REL_SPONSORED,
  REL_STORE,
  searchTerms,
  TCGPLAYER_IMPACT_LINK,
  TCGPLAYER_KEY,
  tcgplayerAffiliateUrl,
  tcgplayerSearchUrl,
} from "../src/lib/affiliate";
import { readFileSync } from "node:fs";
import {
  creativeHref,
  creativeRetailer,
  EBAY_BANNER,
  isEbayHost,
  parseEbayBanner,
} from "../src/lib/affiliate";
import {
  FEED_MAX,
  feedSlots,
  gridPageHasRoomForFooter,
  listHasRoomForFooter,
  productAdPlan,
  quickSearches,
  releaseLinkIndexes,
  soldOutLinks,
  soldOutMates,
  typeChips,
  withFeed,
} from "../src/lib/ebay-ads";
import { REGION_LIST, type Region } from "../src/lib/regions";
import { STORES, TCGPLAYER } from "../src/lib/stores";

const EPN_EXPECTED: Record<Region, { host: string; mkrid: string; siteid: string }> = {
  au: { host: "www.ebay.com.au", mkrid: "705-53470-19255-0", siteid: "15" },
  nz: { host: "www.ebay.com.au", mkrid: "705-53470-19255-0", siteid: "15" },
  us: { host: "www.ebay.com", mkrid: "711-53200-19255-0", siteid: "0" },
  uk: { host: "www.ebay.co.uk", mkrid: "710-53481-19255-0", siteid: "3" },
  ca: { host: "www.ebay.ca", mkrid: "706-53473-19255-0", siteid: "2" },
  eu: { host: "www.ebay.de", mkrid: "707-53477-19255-0", siteid: "77" },
  sg: { host: "www.ebay.com", mkrid: "711-53200-19255-0", siteid: "0" },
};

test("eBay: every region's search carries the full EPN tag set, on the right site", () => {
  for (const r of REGION_LIST) {
    const u = new URL(ebaySearchUrl("Surging Sparks Booster Box", r.region, "product-marketplace"));
    const want = EPN_EXPECTED[r.region];
    assert.equal(u.protocol, "https:");
    assert.equal(u.hostname, want.host, r.region);
    assert.equal(u.pathname, "/sch/i.html");
    assert.equal(u.searchParams.get("mkevt"), "1");
    assert.equal(u.searchParams.get("mkcid"), "1");
    assert.equal(u.searchParams.get("mkrid"), want.mkrid, r.region);
    assert.equal(u.searchParams.get("siteid"), want.siteid, r.region);
    assert.equal(u.searchParams.get("campid"), EBAY_CAMPAIGN_ID);
    assert.equal(u.searchParams.get("toolid"), "10001");
    assert.equal(u.searchParams.get("customid"), `dex-${r.region}-product-marketplace`);
    assert.equal(u.searchParams.get("LH_BIN"), "1");
    assert.equal(u.searchParams.get("_nkw"), "Pokemon Surging Sparks Booster Box sealed");
  }
  assert.equal(EBAY_CAMPAIGN_ID, "5339155912");
});

test("eBay: NZ lands on ebay.com.au and SG on ebay.com, and the labels say so", () => {
  assert.equal(new URL(ebaySearchUrl("x", "nz", "region-home")).hostname, "www.ebay.com.au");
  assert.equal(new URL(ebaySearchUrl("x", "sg", "region-home")).hostname, "www.ebay.com");
  assert.equal(ebayLabel("nz"), "ebay.com.au");
  assert.equal(ebayLabel("sg"), "ebay.com");
  assert.equal(ebayRetailer("au"), "eBay (ebay.com.au)");
  assert.equal(ebayRetailer("nz"), "eBay (ebay.com.au)");
  assert.equal(ebayRetailer("sg"), "eBay (ebay.com)");
});

test("eBay: queries say Pokemon once, lose store punctuation, and an empty name searches everything", () => {
  const q = (name: string) => new URL(ebaySearchUrl(name, "au", "browse-empty")).searchParams.get("_nkw");
  assert.equal(q("Pokémon Center Elite Trainer Box"), "Pokemon Center Elite Trainer Box sealed");
  assert.equal(q("Twilight Masquerade Single Pack Blister [Pupitar]"), "Pokemon Twilight Masquerade Single Pack Blister Pupitar sealed");
  assert.equal(q(""), "Pokemon sealed");
});

test("sub-ids are a safe slug, capped at 60 characters", () => {
  assert.equal(affiliateSubId("dex", "au", "product-best"), "dex-au-product-best");
  assert.equal(affiliateSubId("Dex", "US", "a b/c?d=é"), "dex-us-a-b-c-d");
  assert.equal(affiliateSubId(null, undefined, ""), "dex");
  const long = affiliateSubId("dex", "au", "x".repeat(100));
  assert.ok(long.length <= 60);
  assert.match(long, /^[a-z0-9_-]+$/);
  assert.doesNotMatch(long, /-$/);
  for (const p of PLACEMENTS) for (const r of REGION_LIST) assert.match(affiliateSubId("dex", r.region, p), /^dex-[a-z]{2}-[a-z-]+$/);
});

test("TCGplayer: a tcgplayer.com URL is wrapped in the Impact deep link, and u decodes to the original", () => {
  const target = "https://www.tcgplayer.com/product/565606/pokemon-sv08-surging-sparks-surging-sparks-booster-box";
  const wrapped = tcgplayerAffiliateUrl(target, "us", "product-best");
  assert.ok(wrapped.startsWith(`${TCGPLAYER_IMPACT_LINK}?u=`));
  assert.equal(TCGPLAYER_IMPACT_LINK, "https://partner.tcgplayer.com/c/7385758/1780961/21018");
  const u = new URL(wrapped);
  assert.equal(u.hostname, "partner.tcgplayer.com");
  assert.equal(u.searchParams.get("u"), target);
  assert.equal(u.searchParams.get("sharedid"), "dex-us-product-best");
  // Subdomains are TCGplayer too.
  assert.notEqual(tcgplayerAffiliateUrl("https://shop.tcgplayer.com/pokemon", "au", "product-table"), "https://shop.tcgplayer.com/pokemon");
});

test("TCGplayer: never double-wrapped, and never wraps a look-alike, http, relative or garbage URL", () => {
  const once = tcgplayerAffiliateUrl("https://www.tcgplayer.com/product/1/x", "us", "product-table");
  assert.equal(tcgplayerAffiliateUrl(once, "us", "product-table"), once);
  for (const url of [
    "https://tcgplayer.com.evil.com/product/1",
    "https://eviltcgplayer.com/product/1",
    "https://www.tcgplayer.com@evil.com/product/1",
    "http://www.tcgplayer.com/product/1",
    "/product/1",
    "not a url",
    "",
  ]) {
    assert.equal(tcgplayerAffiliateUrl(url, "us", "product-table"), url, url);
  }
});

test("TCGplayer: the search link is a wrapped Pokémon sealed search", () => {
  const u = new URL(tcgplayerSearchUrl("Pokémon Surging Sparks Booster Box", "au", "set-banner"));
  assert.equal(u.origin + u.pathname, TCGPLAYER_IMPACT_LINK);
  assert.equal(u.searchParams.get("sharedid"), "dex-au-set-banner");
  const target = new URL(u.searchParams.get("u")!);
  assert.equal(target.origin + target.pathname, "https://www.tcgplayer.com/search/pokemon/product");
  assert.equal(target.searchParams.get("productLineName"), "pokemon");
  assert.equal(target.searchParams.get("ProductTypeName"), "Sealed Products");
  assert.equal(target.searchParams.get("view"), "grid");
  assert.equal(target.searchParams.get("q"), "Surging Sparks Booster Box");
  // "Pokémon Center" names a product; an empty name searches all sealed.
  const pc = new URL(new URL(tcgplayerSearchUrl("Pokémon Center Elite Trainer Box", "us", "product-table")).searchParams.get("u")!);
  assert.equal(pc.searchParams.get("q"), "Pokemon Center Elite Trainer Box");
  const all = new URL(new URL(tcgplayerSearchUrl("", "us", "region-home")).searchParams.get("u")!);
  assert.equal(all.searchParams.has("q"), false);
});

test("offerLink: TCGplayer is wrapped and sponsored; a store's link goes out untouched", () => {
  const tcgUrl = "https://www.tcgplayer.com/product/565606/x";
  const t = offerLink(TCGPLAYER_KEY, tcgUrl, "us", "product-table");
  assert.equal(t.rel, REL_SPONSORED);
  assert.equal(t.sponsored, true);
  assert.equal(new URL(t.href).searchParams.get("u"), tcgUrl);
  assert.equal(new URL(t.href).searchParams.get("sharedid"), "dex-us-product-table");

  for (const s of STORES.slice(0, 25)) {
    const url = `${s.base}/products/surging-sparks-booster-box?variant=1`;
    assert.deepEqual(offerLink(s.key, url, "au", "product-best"), { href: url, rel: REL_STORE, sponsored: false });
  }
  // A store row is never wrapped, even if its URL were somehow a TCGplayer one.
  const odd = offerLink("some-store", tcgUrl, "us", "product-table");
  assert.deepEqual(odd, { href: tcgUrl, rel: REL_STORE, sponsored: false });
  // A TCGplayer row whose URL isn't TCGplayer's is not claimed as sponsored.
  const bad = offerLink(TCGPLAYER_KEY, "https://example.com/x", "us", "product-table");
  assert.deepEqual(bad, { href: "https://example.com/x", rel: REL_STORE, sponsored: false });
  assert.match(REL_SPONSORED, /\bsponsored\b/);
  assert.doesNotMatch(REL_STORE, /\bsponsored\b/);
});

test("retailer labels, and affiliate.ts's TCGplayer key matches the registry's", () => {
  assert.equal(TCGPLAYER_KEY, TCGPLAYER.key);
  assert.equal(offerRetailer(TCGPLAYER_KEY, "TCGplayer", "US"), "TCGplayer");
  assert.equal(offerRetailer("pokebox", "Pokebox", "AU"), "Pokebox (AU)");
  assert.ok(!STORES.some((s) => s.key === TCGPLAYER_KEY), "TCGplayer is not an independent store");
});

test("search queries drop store notes and SKU codes, and never send eBay an operator", () => {
  const ebay = (name: string) => new URL(ebaySearchUrl(name, "ca", "product-marketplace")).searchParams.get("_nkw");
  const tcg = (name: string) => new URL(new URL(tcgplayerSearchUrl(name, "us", "product-marketplace")).searchParams.get("u")!).searchParams.get("q");
  // Real product names from the 2026-09-28 import. TCGplayer finds 0 for the raw one, 36 for the clean one.
  const sylveon = "30th Celebration Sylveon ex Box - LIMIT 1 PER CUSTOMER - LOCAL PICKUP ONLY";
  assert.equal(tcg(sylveon), "30th Celebration Sylveon ex Box");
  assert.equal(ebay(sylveon), "Pokemon 30th Celebration Sylveon ex Box sealed");
  assert.equal(searchTerms("Trainer's Toolkit 2025 1 Per Customer"), "Trainer's Toolkit 2025");
  assert.equal(searchTerms("30th Celebration Ultra-Premium Collection Night (Pre Order)"), "30th Celebration Ultra-Premium Collection Night");
  assert.equal(searchTerms("Phantasmal Flames - 3pk Blister - Weaville MAX 1 PER CUSTOMER"), "Phantasmal Flames 3pk Blister Weaville");
  assert.equal(searchTerms("Mega Charizard Tin [MCAP - 000]"), "Mega Charizard Tin");
  assert.equal(searchTerms("V Battle Deck [Melmetal V] [PGO - 0]"), "V Battle Deck Melmetal V");
  // "-Pikachu" would tell eBay to EXCLUDE Pikachu.
  assert.equal(ebay("World Championships 2023 Yokohama Deck -Pikachu"), "Pokemon World Championships 2023 Yokohama Deck Pikachu sealed");
  // What a product's name needs stays.
  assert.equal(searchTerms("Pokémon Center Ultra-Premium Collection"), "Pokemon Center Ultra-Premium Collection");
  assert.equal(searchTerms("Scarlet & Violet 151 Booster Bundle"), "Scarlet & Violet 151 Booster Bundle");
  // A bracketed number is a year or a set, not a SKU code.
  assert.equal(searchTerms("Kanto Power Mini Tin (2025) - Charizard"), "Kanto Power Mini Tin 2025 Charizard");
  assert.equal(searchTerms("Scarlet & Violet (151) Elite Trainer Box"), "Scarlet & Violet 151 Elite Trainer Box");
});

// ─── eBay everywhere: placements, in-feed tiles, quick searches, EPN creative ───

test("eBay units: every placement, in every region, is a tagged search on the right site with a customid of <= 60 characters", () => {
  const NEW = ["header", "region-home-hero", "feed", "browse-feed", "set-feed", "type-feed", "card-soldout", "product-related", "product-after-table", "set-related", "releases-card", "releases-banner", "store-banner", "pre-footer", "footer", "not-found"];
  for (const p of NEW) assert.ok((PLACEMENTS as readonly string[]).includes(p), `${p} is a placement`);
  assert.equal(new Set(PLACEMENTS).size, PLACEMENTS.length, "no duplicate placement");
  for (const placement of PLACEMENTS) {
    for (const r of REGION_LIST) {
      const u = new URL(ebaySearchUrl("Surging Sparks Booster Box", r.region, placement));
      const id = u.searchParams.get("customid")!;
      assert.equal(id, `dex-${r.region}-${placement}`, `${r.region} ${placement}`);
      assert.ok(id.length <= 60, `${id} is ${id.length} characters`);
      assert.equal(u.hostname, EPN_EXPECTED[r.region].host, `${r.region} ${placement}`);
      assert.equal(u.searchParams.get("campid"), "5339155912");
      assert.equal(u.searchParams.get("mkevt"), "1");
    }
  }
  assert.equal(new URL(ebaySearchUrl("", "nz", "pre-footer")).hostname, "www.ebay.com.au");
  assert.equal(new URL(ebaySearchUrl("", "sg", "header")).hostname, "www.ebay.com");
});

test("eBay units: DEPLOY.md lists every placement the events can carry", () => {
  const doc = readFileSync(new URL("../DEPLOY.md", import.meta.url), "utf8");
  for (const p of PLACEMENTS) assert.ok(doc.includes(`\`${p}\``), `DEPLOY.md names ${p}`);
});

test("in-feed tiles: after the 12th, 24th and 36th product, never first, never in the first six, at most three, only with products after", () => {
  assert.deepEqual(feedSlots(48), [12, 24, 36]);
  assert.deepEqual(feedSlots(20), [12]);
  assert.deepEqual(feedSlots(40), [12, 24, 36].filter((k) => 40 - k >= 8));
  assert.deepEqual(feedSlots(12), [], "a tile never ends the grid");
  assert.deepEqual(feedSlots(19), [], "…and needs eight products after it");
  assert.deepEqual(feedSlots(8), [], "a home rail has no tile");
  assert.deepEqual(feedSlots(0), []);
  for (let n = 0; n <= 400; n++) {
    const slots = feedSlots(n);
    assert.ok(slots.length <= FEED_MAX, `${n}: at most three`);
    for (const k of slots) {
      assert.equal(k % 12, 0, `${n}: positions are multiples of 12`);
      assert.ok(k >= 12 && k > 6, `${n}: never in the first six`);
      assert.ok(n - k >= 8, `${n}: products follow the tile`);
    }
    assert.deepEqual(feedSlots(n), slots, "deterministic");
  }
  // A page of 48: the entry order is 12 products, a tile, 12, a tile, 12, a tile, 12.
  const items = Array.from({ length: 48 }, (_, i) => i);
  const entries = withFeed(items);
  assert.equal(entries.length, 51);
  assert.deepEqual(entries.flatMap((e, i) => (e.kind === "feed" ? [i] : [])), [12, 25, 38]);
  assert.equal(entries[0].kind, "item");
  assert.deepEqual(entries.flatMap((e) => (e.kind === "item" ? [e.item] : [])), items, "every product, in order, once");
  assert.deepEqual(withFeed(items), entries, "same input, same output (server and client agree)");
  assert.equal(withFeed(items, false).length, 48, "no feed, no tiles");
});

test("sold-out links: only sold-out cards, past the first eight, sixteen apart from tiles and each other, with eight cards after", () => {
  const soldOut = Array.from({ length: 60 }, () => ({ soldOut: true }));
  const idx = [...soldOutLinks(soldOut)];
  assert.ok(idx.length > 0);
  for (const i of idx) assert.ok(i >= 8 && 59 - i >= 8, `${i} has room each side`);
  for (let k = 1; k < idx.length; k++) assert.ok(idx[k] - idx[k - 1] >= 16, "sixteen apart");
  assert.deepEqual(idx, [8, 24, 40]);
  // In-stock cards never get one; a tile keeps eight clear.
  const mixed = soldOut.map((c, i) => ({ soldOut: i % 2 === 0 }));
  for (const i of soldOutLinks(mixed)) assert.equal(i % 2, 0);
  const withTile = [...soldOut.slice(0, 20), { feed: true as const }, ...soldOut.slice(20)];
  for (const i of soldOutLinks(withTile)) assert.ok(Math.abs(i - 20) >= 16, `${i} is clear of the tile`);
  assert.equal(soldOutLinks(soldOut.slice(0, 16)).size, 0, "a short grid gets none (a related-products row is eight)");
  assert.deepEqual([...soldOutLinks(soldOut)], idx, "deterministic");
});

test("quick searches: the set crossed with box, ETB, bundle and case, minus the product's own type, never more than five", () => {
  const labels = (set: string | null, type?: string) => quickSearches(set, type).map((c) => c.label);
  assert.deepEqual(labels("Surging Sparks"), ["Booster box", "ETB", "Booster bundle", "Case"]);
  assert.deepEqual(labels("Surging Sparks", "booster-box"), ["ETB", "Booster bundle", "Case"]);
  assert.deepEqual(labels("Surging Sparks", "etb"), ["Booster box", "Booster bundle", "Case"]);
  assert.deepEqual(labels("Surging Sparks", "pc-etb"), ["Booster box", "Booster bundle", "Case"], "a Pokémon Center ETB is an ETB");
  assert.deepEqual(labels("Surging Sparks", "booster-bundle"), ["Booster box", "ETB", "Case"]);
  assert.deepEqual(labels("Surging Sparks", "etb-case"), ["Booster box", "ETB", "Booster bundle"]);
  assert.deepEqual(labels("Surging Sparks", "tin"), ["Booster box", "ETB", "Booster bundle", "Case"], "a type with no chip leaves all four");
  assert.deepEqual(labels(null), [], "no set, no searches");
  assert.deepEqual(labels("  "), []);
  for (const t of [undefined, "booster-box", "etb", "tin", "deck", "booster-box-case"]) {
    const own = quickSearches("Surging Sparks", t);
    assert.ok(own.length <= 5);
    for (const c of own) assert.ok(c.query.startsWith("Surging Sparks "), c.query);
  }
  // The searches are real eBay searches inside the set.
  const q = quickSearches("Surging Sparks", "booster-box").map((c) => new URL(ebaySearchUrl(c.query, "au", "product-related")).searchParams.get("_nkw"));
  assert.deepEqual(q, ["Pokemon Surging Sparks Elite Trainer Box sealed", "Pokemon Surging Sparks Booster Bundle sealed", "Pokemon Surging Sparks Booster Box Case sealed"]);
});

test("banner chips: one per product type, inside the set when there is one, minus the type page you are on", () => {
  assert.deepEqual(typeChips().map((c) => c.label), ["Booster boxes", "ETBs", "Booster bundles", "Tins", "Collections", "Packs"]);
  assert.equal(typeChips("Surging Sparks")[0].query, "Surging Sparks Booster Box");
  assert.deepEqual(typeChips(null, "tin").map((c) => c.label), ["Booster boxes", "ETBs", "Booster bundles", "Collections", "Packs"]);
  assert.ok(typeChips(null, "etb").length <= 5);
  assert.equal(typeChips(null, "deck").length, 6);
});

test("page budgets: pure, monotonic, and the footer banner gives way on short pages", () => {
  assert.equal(releaseLinkIndexes(0).size, 0);
  assert.deepEqual([...releaseLinkIndexes(3)], [], "too few cards for a link plus a screen before the banner");
  assert.deepEqual([...releaseLinkIndexes(6)], []);
  assert.deepEqual([...releaseLinkIndexes(7)], [0]);
  assert.deepEqual([...releaseLinkIndexes(19)], [0, 6, 12]);
  for (let n = 0; n < 60; n++) for (const i of releaseLinkIndexes(n)) assert.ok(n - 1 - i >= 6 && i % 6 === 0);
  assert.equal(gridPageHasRoomForFooter(3), false);
  assert.equal(gridPageHasRoomForFooter(40), true);
  assert.equal(listHasRoomForFooter(5), false);
  assert.equal(listHasRoomForFooter(48), true);
  const thin = productAdPlan({ offerRows: 1, elsewhere: 0, related: 0 });
  assert.deepEqual(thin, { tableGroup: false, preFooter: false });
  assert.equal(productAdPlan({ offerRows: 6, elsewhere: 0, related: 0 }).tableGroup, false, "six phone rows are not a screen");
  assert.equal(productAdPlan({ offerRows: 7, elsewhere: 0, related: 0 }).tableGroup, false, "a desktop table is shorter: seven rows are not a screen there");
  // Measured at 1280x900: the panel to the closing group is 808px at 9 rows, 879 at 10, 950-970 at 11.
  assert.equal(productAdPlan({ offerRows: 10, elsewhere: 0, related: 0 }).tableGroup, false, "ten desktop rows leave the two units under a screen apart");
  assert.equal(productAdPlan({ offerRows: 11, elsewhere: 0, related: 0 }).tableGroup, true);
  // A thin page with a few other regions: the phone fits a footer banner, the desktop would not.
  assert.equal(productAdPlan({ offerRows: 4, elsewhere: 3, related: 0 }).preFooter, false);
  const rich = productAdPlan({ offerRows: 12, elsewhere: 3, related: 8 });
  assert.deepEqual(rich, { tableGroup: true, preFooter: true });
  // More content never takes a unit away.
  for (let rows = 0; rows < 15; rows++) {
    const a = productAdPlan({ offerRows: rows, elsewhere: 2, related: 4 });
    const b = productAdPlan({ offerRows: rows + 1, elsewhere: 2, related: 4 });
    assert.ok(!a.tableGroup || b.tableGroup);
  }
});

test("EPN creative: https image and an eBay tracking link only; garbage is ignored, never half-applied", () => {
  const ok = { image: "https://i.ebayimg.com/images/g/abc/s-l728.png", href: "https://rover.ebay.com/rover/1/705-53470-19255-0/1?campid=5339155912&customid=x" };
  assert.deepEqual(parseEbayBanner(ok), { ...ok, width: 728, height: 90, alt: "Shop Pokémon sealed on eBay (advertisement)" });
  assert.deepEqual(parseEbayBanner({ ...ok, width: "300", height: "250", alt: "  Pokémon   on eBay " }), { ...ok, width: 300, height: 250, alt: "Pokémon on eBay" });
  assert.equal(parseEbayBanner({ ...ok, href: "https://ebay.us/abc123" })?.href, "https://ebay.us/abc123");
  assert.equal(parseEbayBanner({ ...ok, href: "https://www.ebay.com.au/sch/i.html?_nkw=x&campid=5339155912" })?.width, 728);
  const bad: [string, Parameters<typeof parseEbayBanner>[0]][] = [
    ["unset", {}],
    ["image only", { image: ok.image }],
    ["href only", { href: ok.href }],
    ["http image", { ...ok, image: "http://i.ebayimg.com/a.png" }],
    ["http href", { ...ok, href: "http://rover.ebay.com/rover/1/x" }],
    ["javascript image", { ...ok, image: "javascript:alert(1)" }],
    ["data image", { ...ok, image: "data:image/png;base64,AAAA" }],
    ["relative image", { ...ok, image: "/banner.png" }],
    ["garbage image", { ...ok, image: "not a url" }],
    ["href is not eBay", { ...ok, href: "https://evil.example/rover" }],
    ["look-alike href", { ...ok, href: "https://ebay.com.evil.example/x" }],
    ["look-alike href 2", { ...ok, href: "https://notebay.com/x" }],
    ["credentials in href", { ...ok, href: "https://user:pw@rover.ebay.com/x" }],
    ["width too small", { ...ok, width: "50" }],
    ["width too big", { ...ok, width: "5000" }],
    ["height 0", { ...ok, height: "0" }],
    ["non-numeric width", { ...ok, width: "wide" }],
    ["negative height", { ...ok, height: "-90" }],
    ["decimal height", { ...ok, height: "90.5" }],
    ["blank strings", { image: " ", href: "" }],
    // A paste mistake must not render an ad link that earns nothing, or credits another campaign.
    ["href without a campid", { ...ok, href: "https://www.ebay.com/" }],
    ["href with another campid", { ...ok, href: "https://rover.ebay.com/rover/1/705-53470-19255-0/1?campid=1234567890" }],
    ["image from a third-party host", { ...ok, image: "https://example.com/b.png" }],
    ["image from a look-alike host", { ...ok, image: "https://ebayimg.com.evil.example/b.png" }],
  ];
  for (const [name, env] of bad) assert.equal(parseEbayBanner(env), null, name);
  assert.equal(isEbayHost("rover.ebay.com"), true);
  assert.equal(isEbayHost("www.ebay.co.uk"), true);
  assert.equal(isEbayHost("ebay.com.evil.example"), false);
  assert.equal(EBAY_BANNER, null, "unset in the test environment: native banners only");
  assert.equal(parseEbayBanner({ ...ok, image: "https://ir.ebaystatic.com/cr/v/c01/b.png" })?.width, 728);
  // The creative's own click: our customid is filled in (short links and a set customid are left alone), and the retailer is the host it really goes to.
  const rover = "https://rover.ebay.com/rover/1/705-53470-19255-0/1?campid=5339155912&customid=&toolid=10001";
  assert.equal(new URL(creativeHref(rover, "eu", "pre-footer")).searchParams.get("customid"), "dex-eu-pre-footer");
  assert.equal(creativeHref("https://ebay.us/abc123", "eu", "pre-footer"), "https://ebay.us/abc123");
  assert.equal(creativeHref(ok.href, "au", "region-home-hero"), ok.href);
  assert.equal(creativeRetailer(rover), "eBay (rover.ebay.com)");
  assert.equal(creativeRetailer("https://www.ebay.de/sch/i.html"), "eBay (ebay.de)");
});

test("search queries drop store-listing noise that eBay would AND into the search", () => {
  assert.equal(searchTerms("Pokemon Meowth VMAX Special Collection International Version Pack Lineup in Description"), "Pokemon Meowth VMAX Special Collection International Version");
  assert.equal(searchTerms("Pokemon League Battle Deck Dragapult ex Miscellaneous Cards & Products"), "Pokemon League Battle Deck Dragapult ex");
  assert.equal(searchTerms("Pokemon Pokeball Tin Series 6 Random Style"), "Pokemon Pokeball Tin Series 6");
  assert.equal(searchTerms("COLLECTION ONLY- Pokemon TCG: Binder Collection 30th Celebration"), "Pokemon TCG: Binder Collection 30th Celebration");
  assert.equal(searchTerms("Pokemon Battle Academy Board Game On Sale"), "Pokemon Battle Academy Board Game");
  assert.equal(searchTerms("Elite Trainer Box 20% VAT"), "Elite Trainer Box");
  assert.equal(searchTerms("Foo PREPRDER 30 May, 2025"), "Foo 30 May, 2025");
  // A real name keeps its hyphens and its words.
  assert.equal(searchTerms("Ultra-Premium Collection"), "Ultra-Premium Collection");
});

test("sold-out links: the cards that share a grid row keep room for them, at every column count", () => {
  const links = new Set([20]);
  const mates = soldOutMates(links, 40);
  assert.ok(!mates.has(20), "the link's own card keeps nothing");
  // 2 columns: 20 and 21. 3 columns: 18-20. 4 columns: 20-23.
  assert.equal(mates.get(21), "block md:hidden lg:block"); // row 7 of 3 columns is 21-23
  assert.equal(mates.get(19), "hidden md:block lg:hidden");
  assert.equal(mates.get(18), "hidden md:block lg:hidden");
  assert.equal(mates.get(22), "hidden md:hidden lg:block");
  assert.equal(mates.get(23), "hidden md:hidden lg:block");
  assert.ok(!mates.has(17) && !mates.has(24), "other rows keep nothing");
  assert.equal(soldOutMates(new Set(), 40).size, 0);
});
