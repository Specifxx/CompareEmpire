import test from "node:test";
import assert from "node:assert/strict";
import { creatorMarkFor, hasMark, paidMarkFor, tagHref, visitMarkFor } from "../src/lib/paid-visit";
import { withVisitMark } from "../src/lib/go";

// The 2026-11-14 Meta tests: a paid visit's affiliate clicks carry `fbad` in their sub-id,
// so the earnings dashboard can sum what each ad earned (lib/paid-visit.ts).

test("only a paid landing gets a marker, by network", () => {
  assert.equal(paidMarkFor("?utm_source=facebook&utm_medium=paid&utm_campaign=rift-test-2026-11"), "fbad");
  assert.equal(paidMarkFor("?utm_source=instagram&utm_medium=cpc"), "fbad");
  assert.equal(paidMarkFor("?utm_source=reddit_ads"), "rdad");
  assert.equal(paidMarkFor("?utm_source=bing&utm_medium=cpc&utm_campaign=dex-bing-2026-12"), "msad");
  assert.equal(paidMarkFor("?utm_source=reddit"), null); // a free Reddit post is not an ad
  assert.equal(paidMarkFor("?utm_source=facebook"), null); // nor is an organic share
  assert.equal(paidMarkFor(""), null);
});

test("the marker is added to every sub-id and nothing else in the URL changes", () => {
  const ebay = "https://www.ebay.com/itm/123?mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=5339155912&toolid=10001&customid=rc-us-ebay-product&_trkparms=a%3Db";
  assert.equal(tagHref(ebay, "fbad"), ebay.replace("customid=rc-us-ebay-product", "customid=rc-us-ebay-product-fbad"));
  const tcg = "https://partner.tcgplayer.com/c/7385758/1780961/21018?subId1=dex-us-price&sharedid=dex-us-price&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F1";
  const t = tagHref(tcg, "fbad")!;
  assert.match(t, /subId1=dex-us-price-fbad&sharedid=dex-us-price-fbad&u=https%3A%2F%2Fwww\.tcgplayer\.com%2Fproduct%2F1$/);
  assert.equal(tagHref(t, "fbad"), null, "tagging twice changes nothing");
  assert.equal(tagHref("https://shop.example.com/p/1", "fbad"), null, "a plain store link is left alone");
});

test("a long sub-id stays within 60 characters and keeps the marker", () => {
  const long = "x".repeat(70);
  const out = tagHref(`https://www.amazon.com/dp/B0?tag=riftcompare-20&ascsubtag=${long}`, "fbad")!;
  const sub = new URL(out).searchParams.get("ascsubtag")!;
  assert.ok(sub.length <= 60);
  assert.ok(hasMark(sub, "fbad"));
});

test("the card engine's /go links get ad=<mark>", () => {
  assert.equal(tagHref("/go?u=https%3A%2F%2Fwww.ebay.com%2Fitm%2F1&s=ebay&m=US", "fbad"), "/go?u=https%3A%2F%2Fwww.ebay.com%2Fitm%2F1&s=ebay&m=US&ad=fbad");
  assert.equal(tagHref("/go?u=x&ad=fbad", "fbad"), null);
});

test("hasMark matches whole segments only", () => {
  assert.ok(hasMark("rc-us-ebay-fbad", "fbad"));
  assert.ok(hasMark("cyberpunk-us-fbad-card-12", "fbad"));
  assert.ok(!hasMark("rc-us-fbadge", "fbad"));
});

// Pay-per-click creators (owner, 2026-11-20): a creator's link tags its visitors' sales too, and /go carries the marker into
// the TCGplayer (Impact) URL it redirects to.

test("a creator landing gets cr + six letters of its campaign; a paid ad still wins", () => {
  assert.equal(creatorMarkFor("?utm_source=instagram&utm_medium=creator&utm_campaign=pokechamp__"), "crpokech");
  assert.equal(creatorMarkFor("?utm_source=instagram&utm_medium=social&utm_campaign=pokechamp"), null);
  assert.equal(visitMarkFor("?utm_source=facebook&utm_medium=paid"), "fbad");
});

test("/go adds the visit's marker to the Impact sub-ids and nothing else", () => {
  const tcg = "https://partner.tcgplayer.com/c/7385758/1780961/21018?subId1=dex-us-product&sharedid=dex-us-product&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F1";
  assert.equal(withVisitMark(tcg, "crpokech"), tcg.replace(/dex-us-product/g, "dex-us-product-crpokech"));
  assert.equal(withVisitMark(tcg, null), tcg);
  assert.equal(withVisitMark(tcg, "<script>"), tcg, "only a marker-shaped value");
  assert.equal(withVisitMark("https://shop.example.com/p/1", "fbad"), "https://shop.example.com/p/1");
});
