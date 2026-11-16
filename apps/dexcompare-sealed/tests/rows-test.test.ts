// The product page's rows test (src/lib/rows-test.ts, DECISIONS.md 2026-11-16): fixed dates, a fair coin, nothing outside the product
// page's table, and never the quick view (whose own A/B tests run 20 Nov to 3 Dec).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RT_END, RT_START, RT_STORES_SHOWN, parseRtArm, rtActive, rtArm, rtEligible, rtKey, rtVisible } from "../src/lib/rows-test";
import { AB_START } from "../src/lib/ab";

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("four whole weeks from 20 Nov", () => {
  assert.equal(new Date(RT_START).toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(RT_END - RT_START, 28 * 86_400_000);
  assert.equal(rtActive(RT_START - 1), false);
  assert.equal(rtActive(RT_START), true);
  assert.equal(rtActive(RT_END), false);
  assert.equal(RT_START, AB_START, "starts with the quick-view tests, after the 19 Nov rechecks read an untouched site");
});

test("a fair coin, a one-letter store, one key per region and arm", () => {
  assert.equal(rtArm(0), "a");
  assert.equal(rtArm(1), "b");
  assert.equal(parseRtArm("b"), "b");
  assert.equal(parseRtArm("x"), null);
  assert.equal(rtKey("us", "b"), "us:b");
});

test("only tables where the cap hides at least four stores are in the test", () => {
  assert.equal(rtEligible(RT_STORES_SHOWN + 3), false);
  assert.equal(rtEligible(RT_STORES_SHOWN + 4), true);
});

test("arm a draws every row; arm b the pinned rows and the cheapest five stores", () => {
  assert.equal(rtVisible("a", 3, 30), 30);
  assert.equal(rtVisible(null, 3, 30), 30);
  assert.equal(rtVisible("b", 3, 30), 8);
});

test("only the product page's table passes the test on; the quick view and the pre-order page never do", () => {
  assert.match(src("components/OfferTable.tsx"), /preorder=\{preorder\} rowsTest \/>/);
  assert.doesNotMatch(src("components/QuickView.tsx"), /rowsTest/);
  assert.match(src("components/EbayStrip.tsx"), /rowsTest && !preorder && rtEligible/);
});

test("the server draws the control: the arm is set only in an effect", () => {
  const c = src("lib/rows-test-client.tsx");
  assert.match(c, /useState<RtVisit \| null>\(null\)/);
  assert.match(c, /useEffect\(/);
});
