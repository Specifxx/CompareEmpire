// The eBay import's buy-click priority and empty-search cache (owner, 2026-11-26: "Add caching and prioritise calls to products with
// the most buy clicks and earnings, so the allowance does not run out on the top products").
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLICKED_EMPTY_SKIP_DAYS,
  clickedItemKeys,
  clickScores,
  DEFAULT_RUN_CAP,
  DEFAULT_SWEEP_CALLS,
  EMPTY_SKIP_DAYS,
  emptyCached,
  itemKeys,
  perProductFeeds,
  RECENT_CLICK_WEIGHT,
  runImport,
} from "../src/lib/ebay-import";
import { feedKey } from "../src/lib/ebay-context";
import { usdToMarketplace } from "../src/lib/ebay-normalise";
import { fakeDb, harness, json, NOW, okToken, planRow } from "./helpers/ebay-fakes";

const DAY = 86_400_000;
const usd = (n: number) => Math.round(n * 100);

test("the defaults leave room on the shared keyset: a run spends at most 2,200 of the 2,500, the sweep 1,700 of them", () => {
  assert.equal(DEFAULT_RUN_CAP, 2200);
  assert.equal(DEFAULT_SWEEP_CALLS, 1700);
  assert.ok(270 + DEFAULT_SWEEP_CALLS < DEFAULT_RUN_CAP, "the per-product searches (clicked products first) always get calls");
});

test("clickScores: 28-day buy clicks plus the last 7 days' again, weighted; nothing for no clicks or a broken file", () => {
  const c = clickScores({ clicks: { a: [10, 4], b: [0, 0], c: [3, 0], d: undefined } });
  assert.equal(c.get("a"), 10 + RECENT_CLICK_WEIGHT * 4);
  assert.equal(c.get("c"), 3);
  assert.ok(!c.has("b") && !c.has("d"));
  assert.equal(clickScores(null).size, 0);
  assert.equal(clickScores({}).size, 0);
});

test("clicked products are searched first, most earning first (clicks × price × market weight), then the hot sets, then by value", () => {
  const rows = [
    planRow("collection", "US", usd(500), { id: "dear-noclicks", name: "Dear Collection Nobody Clicks", slug: "dear" }),
    planRow("collection", "US", usd(60), { id: "popular", name: "Popular Collection", slug: "popular" }),
    planRow("collection", "US", usd(120), { id: "some", name: "Some Clicks Collection", slug: "some" }),
    planRow("collection", "CA", usd(60), { id: "popular", name: "Popular Collection", slug: "popular" }),
  ];
  const clicks = new Map([["popular", 100], ["some", 5]]);
  const keys = clickedItemKeys(rows, clicks);
  assert.deepEqual(keys.map((k) => `${k.marketplace}|${k.productId}`), ["EBAY_US|popular", "EBAY_CA|popular", "EBAY_US|some"], "100 × $60 in the US, then Canada's (CA$60 ≈ US$43, weight 0.25), then 5 × $120");
  const feeds = perProductFeeds(rows, itemKeys(rows), "2026-11-26", clicks);
  assert.deepEqual(feeds.slice(0, 3).map((f) => f.feed), [feedKey("EBAY_US", "item", "popular"), feedKey("EBAY_CA", "item", "popular"), feedKey("EBAY_US", "item", "some")]);
  assert.ok(feeds.slice(0, 3).every((f) => (f.clicks ?? 0) > 0));
  assert.equal(feeds[3].feed, feedKey("EBAY_US", "item", "dear-noclicks"), "the rest keep their value order");
  assert.equal(new Set(feeds.map((f) => f.feed)).size, feeds.length, "no product is searched twice");
  // without clicks: exactly the old order
  assert.deepEqual(perProductFeeds(rows, itemKeys(rows), "2026-11-26").map((f) => f.feed), perProductFeeds(rows, itemKeys(rows), "2026-11-26", new Map()).map((f) => f.feed));
});

test("emptyCached: a week for an ordinary product, two days for one visitors click; never without a record", () => {
  const f = "EBAY_US|item:x";
  const at = (d: number) => new Map([[f, new Date(NOW - d * DAY)]]);
  assert.equal(EMPTY_SKIP_DAYS, 7);
  assert.equal(CLICKED_EMPTY_SKIP_DAYS, 2);
  assert.equal(emptyCached(f, at(6.9), NOW, false), true);
  assert.equal(emptyCached(f, at(7), NOW, false), false);
  assert.equal(emptyCached(f, at(1.9), NOW, true), true);
  assert.equal(emptyCached(f, at(2), NOW, true), false);
  assert.equal(emptyCached(f, new Map(), NOW, false), false);
  assert.equal(emptyCached(f, undefined, NOW, true), false);
});

test("run: an empty search is cached and not bought again; a listing clears it; --force searches anyway", async () => {
  const rows = [
    planRow("etb", "US", usd(80), { id: "ghost", name: "Ghost Set Elite Trainer Box", slug: "ghost" }),
    planRow("etb", "US", usd(80), { id: "real", name: "Surging Sparks Elite Trainer Box", slug: "real" }),
  ];
  const ghost = feedKey("EBAY_US", "item", "ghost");
  const real = feedKey("EBAY_US", "item", "real");
  const searched: string[] = [];
  const handler = (url: string) => {
    if (url.includes("/oauth2/token")) return okToken();
    const q = new URL(url).searchParams.get("q") ?? "";
    searched.push(q);
    if (q.includes("Ghost")) return json({ itemSummaries: [] });
    const p = usdToMarketplace(80, "EBAY_US");
    return json({ itemSummaries: [
      { itemId: "v1|11|0", title: "Pokemon TCG Surging Sparks Elite Trainer Box Sealed", image: { imageUrl: "https://i.ebayimg.com/images/g/a/s-l225.jpg" }, price: { value: p.toFixed(2), currency: "USD" }, itemWebUrl: "https://www.ebay.com/itm/11", condition: "Brand New", buyingOptions: ["FIXED_PRICE"], shippingOptions: [{ shippingCostType: "FIXED", shippingCost: { value: "0.00", currency: "USD" } }] },
    ] });
  };
  const db = fakeDb(rows);
  db.empties.set(real, new Date(NOW - 30 * DAY)); // an old record: real is searched, finds listings, and is forgotten
  const h = harness(handler);
  const s = await runImport({ db, api: h.deps, env: {}, log: () => {}, clicks: new Map([["ghost", 5]]) }, { only: ["items"], concurrency: 1 });
  assert.equal(s.buckets.items.clickedSearched, 1);
  assert.ok(db.empties.has(ghost), "the empty search is recorded");
  assert.equal(db.empties.get(ghost)!.getTime(), NOW);
  // the next day: ghost is clicked, so it waits two days, not seven
  const h2 = harness(handler);
  h2.clock.t = NOW + 1 * DAY;
  searched.length = 0;
  const s2 = await runImport({ db, api: h2.deps, env: {}, log: () => {}, clicks: new Map([["ghost", 5]]) }, { only: ["items"], concurrency: 1 });
  assert.equal(s2.buckets.items.cachedEmpty, 1);
  assert.ok(!searched.some((q) => q.includes("Ghost")), "not searched again inside the window");
  // two days on it is searched again; --force ignores the cache
  const h3 = harness(handler);
  h3.clock.t = NOW + 2 * DAY + 1;
  searched.length = 0;
  await runImport({ db, api: h3.deps, env: {}, log: () => {}, clicks: new Map([["ghost", 5]]) }, { only: ["items"], concurrency: 1 });
  assert.ok(searched.some((q) => q.includes("Ghost")));
  const h4 = harness(handler);
  h4.clock.t = NOW + 2 * DAY + 3 * 3600_000;
  searched.length = 0;
  await runImport({ db, api: h4.deps, env: {}, log: () => {} }, { only: ["items"], concurrency: 1, force: true });
  assert.ok(searched.some((q) => q.includes("Ghost")), "--force searches a cached product");
});

test("run: a database with no cache (an old fake, a missing table) still runs, caching nothing", async () => {
  const rows = [planRow("etb", "US", usd(80), { id: "ghost", name: "Ghost Set Elite Trainer Box" })];
  const db = fakeDb(rows);
  delete (db as Partial<typeof db>).emptyFeeds;
  delete (db as Partial<typeof db>).markEmpty;
  delete (db as Partial<typeof db>).clearEmpty;
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({ itemSummaries: [] })));
  const s = await runImport({ db, api: h.deps, env: {}, log: () => {} }, { only: ["items"], concurrency: 1 });
  assert.equal(s.buckets.items.emptied, 1);
  assert.equal(s.buckets.items.cachedEmpty, 0);
});
