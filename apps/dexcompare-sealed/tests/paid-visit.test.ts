import test from "node:test";
import assert from "node:assert/strict";
import { hasMark, paidMarkFor, tagHref } from "../src/lib/paid-visit";

// The 2026-11-14 Meta tests: a paid visit's affiliate clicks carry `fbad` in their sub-id,
// so the earnings dashboard can sum what each ad earned (lib/paid-visit.ts).

test("only a paid landing gets a marker, by network", () => {
  assert.equal(paidMarkFor("?utm_source=facebook&utm_medium=paid&utm_campaign=rift-test-2026-11"), "fbad");
  assert.equal(paidMarkFor("?utm_source=instagram&utm_medium=cpc"), "fbad");
  assert.equal(paidMarkFor("?utm_source=reddit_ads"), "rdad");
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
