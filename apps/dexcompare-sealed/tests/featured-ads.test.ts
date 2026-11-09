import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADS_FEED, ADS_SERVICE, WEEK_PRICE_USD, adsToShow } from "../src/lib/featured-ads";

const now = Date.parse("2026-11-10T00:00:00Z");
const ad = (o: Record<string, unknown> = {}) => ({ id: "a", title: "Charizard", blurb: null, url: "https://www.ebay.com/itm/1", image: "https://i.ebayimg.com/a.jpg", price: null, region: "ALL", startsAt: "2026-11-09T00:00:00Z", endsAt: "2026-11-16T00:00:00Z", ...o });

test("an ad shows only inside its own dates, so it ends on time whatever the CDN holds", () => {
  assert.equal(adsToShow([ad()], "AU", now).length, 1);
  assert.equal(adsToShow([ad({ endsAt: "2026-11-09T12:00:00Z" })], "AU", now).length, 0);
  assert.equal(adsToShow([ad({ startsAt: "2026-11-11T00:00:00Z" })], "AU", now).length, 0);
});

test("region match, https only, at most three, junk ignored", () => {
  assert.equal(adsToShow([ad({ region: "US" })], "AU", now).length, 0);
  assert.equal(adsToShow([ad({ region: "AU" })], "AU", now).length, 1);
  assert.equal(adsToShow([ad({ url: "javascript:alert(1)" }), ad({ image: "http://x.com/a.jpg" })], "AU", now).length, 0);
  assert.equal(adsToShow(Array.from({ length: 6 }, (_, i) => ad({ id: String(i) })), "AU", now).length, 3);
  assert.deepEqual(adsToShow(null, "AU", now), []);
  assert.deepEqual(adsToShow([null, 5, {}], "AU", now), []);
});

test("the service is RiftCompare's, the price is US$100 a week", () => {
  assert.equal(ADS_SERVICE, "https://riftcompare.com/api/sister-ads");
  assert.equal(ADS_FEED, "https://riftcompare.com/api/sister-ads/dex");
  assert.equal(WEEK_PRICE_USD, 100);
});

test("the banner is labelled a paid link, kept out of the comparison, and its link is sponsored", () => {
  const src = readFileSync(new URL("../src/components/FeaturedAds.tsx", import.meta.url), "utf8");
  assert.match(src, /Paid link/);
  assert.match(src, /Not part of the comparison/);
  assert.match(src, /rel="sponsored nofollow noopener noreferrer"/);
  assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
});
