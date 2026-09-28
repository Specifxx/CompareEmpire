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
