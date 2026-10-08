import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BREAKER_EMPTY,
  BREAKER_FAILURES,
  freshWindowMs,
  PROGRESS_EVERY,
  startReport,
  BUCKETS,
  buildPlan,
  CHASE_QUERIES,
  capsFromEnv,
  fixedFeeds,
  itemKeys,
  itemQuery,
  MARKETPLACE_ORDER,
  purgeCutoff,
  retryAllowance,
  runCap,
  runImport,
  SEALED_QUERIES,
  selectFeedItems,
  setFeedSets,
  setQuery,
  SOLD_OUT_BOOST,
  TYPE_FEEDS,
  type ImportDeps,
} from "../src/lib/ebay-import";
import { ALWAYS_TYPES, GATED_MAX_USD, GATED_TYPES, ITEM_CORE_USD, ITEM_FLOOR_USD, referenceUsd, tierOf } from "../src/lib/ebay-eligibility";
import { budgetDay, DDL } from "../src/lib/ebay-store";
import { capacityReport, runReport } from "../src/lib/ebay-report";
import { hoursToMs, MARKET_WEIGHT } from "../src/lib/ebay-context";
import { PRODUCT_TYPES, fromRoughUsdCents, type TypeKey } from "../src/lib/sealed-title";
import { SETS } from "../src/lib/sets";
import { fakeDb, harness, json, NOW, okToken, planRow, requestedReference, summary, withReference, type FakeDb, type Handler } from "./helpers/ebay-fakes";

const TODAY = "2026-10-07";
const usdCents = (usd: number, market: string) => Math.round(fromRoughUsdCents(usd * 100, market));

// ─── the budget day ─────────────────────────────────────────────────────────────

test("the budget day is the PACIFIC day, across daylight-saving changes", () => {
  assert.equal(budgetDay(Date.parse("2026-10-07T06:37:00Z")), "2026-10-06", "06:37 UTC is still the previous Pacific day: the daily cron is NOT here (it runs after the reset, 08:37 UTC)");
  assert.equal(budgetDay(Date.parse("2026-10-07T06:59:59Z")), "2026-10-06");
  assert.equal(budgetDay(Date.parse("2026-10-07T07:00:00Z")), "2026-10-07", "midnight Pacific in summer is 07:00 UTC");
  // fall back (2026-11-01, 09:00 UTC): midnight Pacific moves to 08:00 UTC
  assert.equal(budgetDay(Date.parse("2026-11-01T06:59:00Z")), "2026-10-31");
  assert.equal(budgetDay(Date.parse("2026-11-01T07:00:00Z")), "2026-11-01");
  assert.equal(budgetDay(Date.parse("2026-11-02T07:59:00Z")), "2026-11-01", "winter: still the 1st at 07:59 UTC");
  assert.equal(budgetDay(Date.parse("2026-11-02T08:00:00Z")), "2026-11-02");
  // spring forward (2026-03-08, 10:00 UTC)
  assert.equal(budgetDay(Date.parse("2026-03-08T07:59:00Z")), "2026-03-07");
  assert.equal(budgetDay(Date.parse("2026-03-08T08:00:00Z")), "2026-03-08");
  assert.equal(budgetDay(Date.parse("2026-03-09T06:59:00Z")), "2026-03-08");
  assert.equal(budgetDay(Date.parse("2026-03-09T07:00:00Z")), "2026-03-09");
  assert.match(budgetDay(NOW), /^\d{4}-\d{2}-\d{2}$/);
});

test("the DDL is what prisma db push makes (so a self-healed table is the table db push expects)", () => {
  const sql = DDL.join("\n");
  for (const col of ['"feed" TEXT NOT NULL', '"rank" INTEGER NOT NULL', '"itemId" TEXT NOT NULL', '"imageUrl" TEXT NOT NULL', '"priceValue" TEXT NOT NULL', '"shipValue" TEXT,', '"shipFree" BOOLEAN,', '"condition" TEXT,', '"fetchedAt" TIMESTAMP(3) NOT NULL', 'PRIMARY KEY ("feed","rank")', '"day" TEXT NOT NULL', '"total" INTEGER NOT NULL']) assert.ok(sql.includes(col), col);
  assert.ok(DDL.every((s) => /IF NOT EXISTS/.test(s)));
  assert.ok(/EbayListing_fetchedAt_idx/.test(sql));
});

// ─── eligibility ────────────────────────────────────────────────────────────────

test("eligibility thresholds: US$50 core for the gated types, US$25 floor for all, never packs", () => {
  assert.equal(ITEM_CORE_USD, 50);
  assert.equal(ITEM_FLOOR_USD, 25);
  for (const t of ALWAYS_TYPES) {
    assert.equal(tierOf(t, 24.99), "no", `${t} under the floor`);
    assert.equal(tierOf(t, 25), "core", t);
    assert.equal(tierOf(t, 400), "core", t);
  }
  for (const t of GATED_TYPES) {
    assert.equal(tierOf(t, 24.99), "no", t);
    assert.equal(tierOf(t, 25), "extension", t);
    assert.equal(tierOf(t, 49.99), "extension", t);
    assert.equal(tierOf(t, 50), "core", t);
  }
  for (const t of ["booster-pack", "sleeved-booster"] as TypeKey[]) for (const usd of [10, 25, 50, 500, 5000]) assert.equal(tierOf(t, usd), "no", t);
  assert.equal(tierOf("etb", null), "no");
  // every type is in exactly one class
  const all = new Set(PRODUCT_TYPES.map((t) => t.key));
  for (const t of all) assert.ok([ALWAYS_TYPES.has(t), GATED_TYPES.has(t), t === "booster-pack" || t === "sleeved-booster"].filter(Boolean).length === 1, t);
});

test("eligibility edges per currency: US$50 and US$25 in each market's money", () => {
  // thresholds (rough FX table: AU 1.5, NZ 1.65, US 1, UK 0.78, CA 1.37, EU 0.9, SG 1.3)
  const core: Record<string, number> = { AU: 75, NZ: 82.5, US: 50, UK: 39, CA: 68.5, EU: 45, SG: 65 };
  for (const [market, c] of Object.entries(core)) {
    const at = (value: number) => referenceUsd({ market, openCents: Math.round(value * 100), anyCents: null });
    assert.equal(tierOf("collection", at(c + 0.01)), "core", `${market} just over US$50`);
    assert.equal(tierOf("collection", at(c - 0.5)), "extension", `${market} just under US$50`);
    assert.equal(tierOf("collection", at(c / 2 + 0.01)), "extension", `${market} just over US$25`);
    assert.equal(tierOf("collection", at(c / 2 - 0.5)), "no", `${market} under US$25`);
  }
  // best-known = the cheapest OPEN price, else the cheapest listed one (a sold-out product), else unknown
  assert.equal(referenceUsd({ market: "US", openCents: 6000, anyCents: 5000 }), 60);
  assert.equal(referenceUsd({ market: "US", openCents: null, anyCents: 5000 }), 50);
  assert.equal(referenceUsd({ market: "US", openCents: null, anyCents: null }), null);
  assert.equal(referenceUsd({ market: "US", openCents: 0, anyCents: 0 }), null);
});

test("item keys: only regions with a ProductStat row, one key per (marketplace, product), highest reference price of the marketplace's regions", () => {
  const etb = (market: string, usd: number, o = {}) => planRow("etb", market, usdCents(usd, market), { id: "etb1", name: "Surging Sparks Elite Trainer Box", ...o });
  // AU and NZ share EBAY_AU: one key; SG and US share EBAY_US: one key; UK a second marketplace; EU none (no row)
  const keys = itemKeys([etb("AU", 60), etb("NZ", 70), etb("US", 55), etb("SG", 50), etb("UK", 60)]);
  assert.equal(keys.length, 3);
  assert.deepEqual(keys.map((k) => k.marketplace).sort(), ["EBAY_AU", "EBAY_GB", "EBAY_US"]);
  assert.equal(keys.find((k) => k.marketplace === "EBAY_AU")!.usd.toFixed(0), "70", "the higher of AU and NZ");
  assert.ok(!keys.some((k) => k.marketplace === "EBAY_DE" || k.marketplace === "EBAY_CA"), "no stat row there, no key");
  // an NZ-only product is an EBAY_AU key; an SG-only one an EBAY_US key
  assert.equal(itemKeys([etb("NZ", 60, { id: "n" })])[0].marketplace, "EBAY_AU");
  assert.equal(itemKeys([etb("SG", 60, { id: "s" })])[0].marketplace, "EBAY_US");
  // packs never; a price under the floor never; unknown price never
  assert.equal(itemKeys([planRow("booster-pack", "US", 9999, { id: "bp" }), planRow("sleeved-booster", "US", 9999, { id: "sb" })]).length, 0);
  assert.equal(itemKeys([etb("US", 24, { id: "cheap" })]).length, 0);
  assert.equal(itemKeys([{ ...etb("US", 60, { id: "x" }), openCents: null, anyCents: null }]).length, 0);
});

test("ranking: core before extension; within a tier reference price x market weight, sold-out x1.5; stable", () => {
  const rows = [
    planRow("collection", "US", usdCents(60, "US"), { id: "c-us60", name: "Alpha Premium Collection" }),
    planRow("collection", "DE" === "DE" ? "EU" : "EU", usdCents(60, "EU"), { id: "c-eu60", name: "Alpha Premium Collection" }),
    planRow("collection", "US", usdCents(40, "US"), { id: "c-us40", name: "Beta Premium Collection" }), // extension
    planRow("tin", "US", usdCents(55, "US"), { id: "t-us55-sold", name: "Gamma Tin", soldOut: true }),
    planRow("tin", "UK", usdCents(80, "UK"), { id: "t-uk80", name: "Delta Tin" }),
    planRow("etb", "CA", usdCents(100, "CA"), { id: "e-ca100", name: "Surging Sparks Elite Trainer Box" }),
  ];
  const order = itemKeys(rows).map((k) => `${k.productId}@${k.marketplace}`);
  // values: e-ca100 = 100x0.5 = 50, t-us55-sold = 55x1x1.5 = 82.5, t-uk80 = 80x0.6 = 48, c-us60 = 60, c-eu60 = 60x0.4 = 24 ; then the extension c-us40
  assert.deepEqual(order, ["t-us55-sold@EBAY_US", "c-us60@EBAY_US", "e-ca100@EBAY_CA", "t-uk80@EBAY_GB", "c-eu60@EBAY_DE", "c-us40@EBAY_US"]);
  assert.equal(SOLD_OUT_BOOST, 1.5);
  assert.deepEqual(MARKET_WEIGHT, { EBAY_US: 1, EBAY_GB: 0.6, EBAY_AU: 0.6, EBAY_CA: 0.5, EBAY_DE: 0.4 });
  // stable: the same input in any order gives the same ranking
  assert.deepEqual(itemKeys([...rows].reverse()).map((k) => `${k.productId}@${k.marketplace}`), order);
  // equal values tie-break by product id
  const tie = itemKeys([planRow("etb", "US", 6000, { id: "b", name: "Surging Sparks Elite Trainer Box" }), planRow("etb", "US", 6000, { id: "a", name: "Prismatic Evolutions Elite Trainer Box" })]);
  assert.deepEqual(tie.map((k) => k.productId), ["a", "b"]);
  assert.ok(itemKeys(rows).find((k) => k.productId === "t-us55-sold")!.soldOut);
});

// ─── the plan ───────────────────────────────────────────────────────────────────

test("fixed feeds: chase 5x8 + sealed 5x6 + types 5x9 + sets 5x30 = 40 + 30 + 45 + 150 calls, in priority order", () => {
  const feeds = fixedFeeds(TODAY);
  const calls = (b: string) => feeds.filter((f) => f.bucket === b).reduce((a, f) => a + f.searches.length, 0);
  assert.deepEqual([calls("chase"), calls("sealed"), calls("types"), calls("sets")], [40, 30, 45, 150]);
  assert.equal(CHASE_QUERIES.length, 8);
  assert.equal(SEALED_QUERIES.length, 6);
  assert.equal(TYPE_FEEDS.length, 9);
  const order = feeds.map((f) => f.bucket);
  assert.deepEqual([...new Set(order)], ["chase", "sealed", "types", "sets"]);
  assert.equal(order.lastIndexOf("chase") < order.indexOf("sealed"), true);
  // the biggest marketplace first, so a cap hit drops EBAY_DE before EBAY_US
  assert.deepEqual(MARKETPLACE_ORDER, ["EBAY_US", "EBAY_AU", "EBAY_GB", "EBAY_CA", "EBAY_DE"]);
  assert.deepEqual(feeds.filter((f) => f.bucket === "chase").map((f) => f.feed), MARKETPLACE_ORDER.map((m) => `${m}|chase`));
  for (const f of feeds) for (const s of f.searches) {
    assert.ok(s.q.length <= 100 && s.q.startsWith("Pokemon "), s.q);
    assert.equal(s.marketplace, f.marketplace);
  }
  assert.ok(feeds.filter((f) => f.bucket === "types").every((f) => f.searches.length === 1));
  // the high-value type feeds
  const slugs = new Set(feeds.filter((f) => f.bucket === "types").map((f) => f.feed.split("type:")[1]));
  assert.deepEqual([...slugs].sort(), ["booster-box-cases", "booster-boxes", "booster-bundle-cases", "build-and-battle-stadiums", "collections", "elite-trainer-box-cases", "elite-trainer-boxes", "pokemon-center-elite-trainer-boxes", "ultra-premium-collections"]);
});

test("set feeds: the 30 most recently RELEASED sets, never a series-named set, a common-word set or an unreleased one", () => {
  const sets = setFeedSets(TODAY);
  assert.equal(sets.length, 30);
  assert.ok(sets.every((s) => s.releaseDate <= TODAY && !s.generic && !["xy12", "g1", "cel25"].includes(s.code)));
  assert.ok(!sets.some((s) => s.code === "me6"), "Delta Reign is not out yet");
  assert.ok(!sets.some((s) => s.code === "me1" || s.code === "sv1"), "series-named");
  for (let i = 1; i < sets.length; i++) assert.ok(sets[i - 1].releaseDate >= sets[i].releaseDate, "newest first");
  assert.equal(sets[0].code, "cel30");
  assert.equal(setFeedSets("2026-01-01")[0].code, "me2");
  assert.equal(setQuery(SETS.find((s) => s.code === "sv8")!), "Surging Sparks special illustration rare");
  assert.equal(setQuery(SETS.find((s) => s.code === "swsh12")!), "Silver Tempest alt art");
  const xy = SETS.find((s) => s.series === "XY")!;
  assert.equal(setQuery(xy), `${xy.name} full art`);
  assert.equal(setQuery(SETS.find((s) => s.code === "pgo")!), "Pokemon GO alt art", "Pokémon GO is a Sword & Shield set; accents are folded");
});

test("item queries: Pokemon + the cleaned product name + sealed, at most 100 characters, store noise removed", () => {
  assert.equal(itemQuery("Surging Sparks Elite Trainer Box"), "Pokemon Surging Sparks Elite Trainer Box sealed");
  assert.equal(itemQuery("Pokémon GO Elite Trainer Box"), "Pokemon GO Elite Trainer Box sealed");
  assert.equal(itemQuery("Charizard ex Premium Collection [Limit 1 Per Customer] - Local Pickup Only"), "Pokemon Charizard ex Premium Collection sealed");
  const long = itemQuery("Mega Evolution Perfect Order " + "Extraordinarily Long Product Name ".repeat(6));
  assert.ok(long.length <= 100 && long.startsWith("Pokemon "));
  assert.ok(!long.endsWith(" "));
});

const MANY = (n: number): ReturnType<typeof planRow>[] =>
  Array.from({ length: n }, (_, i) => planRow("collection", ["US", "AU", "UK", "CA", "EU"][i % 5], usdCents(50 + (i % 500), ["US", "AU", "UK", "CA", "EU"][i % 5]), { id: `c${String(i).padStart(4, "0")}`, name: `Test Collection Number ${i}` }));

test("a placeholder ask (a sold-out blister at CA$9,999) is not an eligible key, so it cannot eat the day's calls", () => {
  const real = planRow("collection", "US", usdCents(80, "US"), { id: "real", name: "Real Premium Collection" });
  const fake = planRow("blister", "CA", usdCents(7299, "CA"), { id: "fake", name: "Placeholder Blister", soldOut: true });
  const edge = planRow("tin", "US", usdCents(600, "US"), { id: "edge", name: "Edge Tin" });
  const over = planRow("tin", "US", usdCents(601, "US"), { id: "over", name: "Over Tin" });
  assert.deepEqual(itemKeys([fake, real, edge, over]).map((k) => k.productId).sort(), ["edge", "real"]);
  assert.equal(GATED_MAX_USD, 600);
  assert.equal(tierOf("booster-box", 9000), "core", "a real vintage box can cost thousands");
});

test("buildPlan: spends the cap in priority order; a cap hit drops the LEAST valuable; calls never exceed the cap", () => {
  const rows = MANY(300);
  const full = buildPlan(rows, { cap: 2000, today: TODAY });
  assert.equal(full.calls, 265 + 300);
  assert.equal(full.byBucket.items.feeds, 300);
  assert.equal(full.items.core, 300);
  assert.equal(full.items.coreCovered, 300, "all fit");
  const items = full.feeds.filter((f) => f.bucket === "items");
  const values = items.map((f) => f.item!.value);
  for (let i = 1; i < values.length; i++) assert.ok(values[i - 1] >= values[i], "most valuable first");
  assert.equal(full.feeds.findIndex((f) => f.bucket === "items") > full.feeds.findLastIndex((f) => f.bucket === "sets"), true);
  for (const cap of [0, 1, 7, 8, 39, 40, 41, 70, 71, 100, 115, 264, 265, 266, 300, 565]) {
    const p = buildPlan(rows, { cap, today: TODAY });
    assert.ok(p.calls <= cap, `${cap}`);
    assert.equal(p.calls, p.feeds.reduce((a, f) => a + f.searches.length, 0));
    // strict priority: nothing of a lower bucket is planned while a higher bucket has an unplanned feed
    const idx = (b: string) => BUCKETS.indexOf(b as never);
    const planned = p.feeds.map((f) => idx(f.bucket));
    for (let i = 1; i < planned.length; i++) assert.ok(planned[i] >= planned[i - 1]);
  }
  assert.equal(buildPlan(rows, { cap: 0, today: TODAY }).feeds.length, 0);
  assert.equal(buildPlan(rows, { cap: 7, today: TODAY }).feeds.length, 0, "the first chase feed needs 8 calls");
  // 300 items but a cap of 300 + 265: exactly the 35 least valuable items miss out at cap 530
  const tight = buildPlan(rows, { cap: 265 + 250, today: TODAY });
  assert.equal(tight.byBucket.items.feeds, 250);
  assert.equal(tight.items.coreCovered, 250);
  const dropped = new Set(items.map((f) => f.feed));
  for (const f of tight.feeds.filter((x) => x.bucket === "items")) dropped.delete(f.feed);
  const minKept = Math.min(...tight.feeds.filter((x) => x.bucket === "items").map((x) => x.item!.value));
  for (const f of items) if (dropped.has(f.feed)) assert.ok(f.item!.value <= minKept);
});

test("buildPlan: the extension (US$25-50) is bought only after EVERY core key, and never below US$25", () => {
  const core = MANY(20);
  const ext = Array.from({ length: 10 }, (_, i) => planRow("tin", "US", usdCents(25 + i * 2, "US"), { id: `e${i}`, name: `Test Tin Extension ${i}` }));
  const below = [planRow("tin", "US", usdCents(24, "US"), { id: "low", name: "Cheap Tin" })];
  const rows = [...ext, ...below, ...core];
  const p = buildPlan(rows, { cap: 265 + 20, today: TODAY });
  assert.equal(p.items.coreCovered, 20);
  assert.equal(p.items.extensionCovered, 0, "the budget ended exactly at the last core key");
  const p2 = buildPlan(rows, { cap: 265 + 25, today: TODAY });
  assert.equal(p2.items.extensionCovered, 5);
  const covered = p2.feeds.filter((f) => f.item?.tier === "extension").map((f) => f.item!.productId);
  assert.deepEqual(covered, ["e9", "e8", "e7", "e6", "e5"], "downward by price: the dearest of the extension first");
  const p3 = buildPlan(rows, { cap: 5000, today: TODAY });
  assert.equal(p3.items.extensionCovered, 10);
  assert.ok(!p3.feeds.some((f) => f.item?.productId === "low"), "never below US$25");
  assert.equal(p3.keys.length, 30);
});

test("buildPlan: --only buckets, and the plan reports what it wanted vs got", () => {
  const rows = MANY(10);
  const p = buildPlan(rows, { cap: 2000, today: TODAY, only: ["items"] });
  assert.equal(p.feeds.length, 10);
  assert.equal(p.byBucket.chase.wanted, 0);
  const q = buildPlan(rows, { cap: 2000, today: TODAY, only: ["chase", "sets"] });
  assert.deepEqual([...new Set(q.feeds.map((f) => f.bucket))], ["chase", "sets"]);
  const r = buildPlan(MANY(3000), { cap: 2000, today: TODAY });
  assert.equal(r.calls, 2000);
  assert.ok(r.byBucket.items.wanted === 3000 && r.byBucket.items.feeds === 1735 && r.items.core === 3000 && r.items.coreCovered === 1735);
  const text = capacityReport(r).join("\n");
  assert.match(text, /NOT all core keys fit/);
  assert.match(capacityReport(buildPlan(rows, { cap: 2000, today: TODAY })).join("\n"), /ALL core keys fit/);
});

// ─── caps ───────────────────────────────────────────────────────────────────────

test("caps: daily 2400 (clamped 0..2500), run 2000, and the run's allowance is what the database says is left", () => {
  assert.deepEqual(capsFromEnv({}), { daily: 2400, run: 2000 });
  assert.deepEqual(capsFromEnv({ EBAY_DAILY_CAP: "3000", EBAY_RUN_CAP: "9999" }), { daily: 2500, run: 2500 });
  assert.deepEqual(capsFromEnv({ EBAY_DAILY_CAP: "-5", EBAY_RUN_CAP: "x" }), { daily: 0, run: 2000 });
  assert.deepEqual(capsFromEnv({ EBAY_DAILY_CAP: " 1000 ", EBAY_RUN_CAP: "400" }), { daily: 1000, run: 400 });
  assert.equal(runCap({ daily: 2400, run: 2000 }, 0), 2000);
  assert.equal(runCap({ daily: 2400, run: 2000 }, 1000), 1400);
  assert.equal(runCap({ daily: 2400, run: 2000 }, 2400), 0);
  assert.equal(runCap({ daily: 2400, run: 2000 }, 2999), 0);
  assert.equal(runCap({ daily: 2400, run: 2000 }, 0, 300), 300);
  assert.equal(runCap({ daily: 2400, run: 2000 }, 0, 5000), 2000);
  assert.equal(retryAllowance(2000), 105);
  assert.equal(hoursToMs(30), purgeCutoff(NOW, {}).getTime() === NOW - hoursToMs(30) ? hoursToMs(30) : -1, "purge: 26 h bound + 4 h");
  assert.equal(purgeCutoff(NOW, { EBAY_LISTING_MAX_AGE_HOURS: "5.5" }).getTime(), NOW - hoursToMs(9.5));
});

// ─── the run ────────────────────────────────────────────────────────────────────

/** A search handler: chase-shaped cards for card queries, and the product's own title for an item query; counts searches. */
function ebay(over: { onSearch?: (n: number, url: string) => Response | undefined } = {}): { handler: Handler; n: () => number } {
  let n = 0;
  const handler: Handler = (url, init) => {
    if (url.includes("/oauth2/token")) return okToken();
    n++;
    const forced = over.onSearch?.(n, url);
    if (forced) return forced;
    const q = new URL(url).searchParams.get("q") ?? "";
    const mp = ((init?.headers ?? {}) as Record<string, string>)["X-EBAY-C-MARKETPLACE-ID"] ?? "EBAY_US";
    const subject = q.replace(/^Pokemon /, "").replace(/ sealed$/, "");
    const cards = Array.from({ length: 4 }, (_, i) => summary(`${n}${i}`, `${subject} ${190 + i}/165 Special Illustration Rare Pokemon Card`, 60 + i, mp));
    const product = Array.from({ length: 3 }, (_, i) => summary(`${n}${i}`, `Pokemon TCG ${subject} Sealed NEW ${i}`, 70 + i * 10, mp));
    return json({ itemSummaries: withReference(/Elite Trainer Box|Collection|Tin/.test(q) && !/special illustration|alt art|full art/.test(q) ? product : cards, requestedReference(init)) });
  };
  return { handler, n: () => n };
}

function deps(db: FakeDb, h: ReturnType<typeof harness>, env: ImportDeps["env"] = {}): ImportDeps {
  return { db, api: h.deps, env, log: () => {} };
}

test("run: every search is reserved BEFORE it is made; the database counter equals the searches made", async () => {
  const e = ebay();
  const h = harness(e.handler);
  const db = fakeDb(MANY(40));
  const order: string[] = [];
  const reserve = db.reserve.bind(db);
  db.reserve = async (...a) => (order.push("reserve"), reserve(...a));
  const fetch0 = h.deps.fetch;
  h.deps.fetch = async (u, i) => (u.includes("/item_summary/search") && order.push("search"), fetch0(u, i));
  const s = await runImport(deps(db, h), { concurrency: 1 });
  assert.equal(h.searches().length, 265 + 40);
  assert.equal(s.searches, 305);
  assert.equal(db.days.get(s.day), 305, "the counter equals the calls made");
  assert.equal(s.usedAfter, 305);
  // never a search without its reservation first
  let reserved = 0;
  let searched = 0;
  for (const o of order) {
    if (o === "reserve") reserved++;
    else {
      searched++;
      assert.ok(searched <= reserved, "a search happened before its reservation");
    }
  }
  assert.equal(h.tokens().length, 1);
  assert.equal(db.ensured, 1, "the tables are created if missing");
  assert.ok(s.buckets.chase.refreshed === 5 && s.buckets.sets.refreshed === 150);
  assert.ok(s.buckets.items.refreshed === 40, JSON.stringify(s.buckets.items));
  assert.ok(db.purges.length >= 2, "purged at the start and at the end");
});

test("run: three overlapping runs and a manual dispatch can never pass the daily cap", async () => {
  const e = ebay();
  const db = fakeDb(MANY(200));
  const env = { EBAY_DAILY_CAP: "500", EBAY_RUN_CAP: "400" };
  const runs = await Promise.all([0, 1, 2, 3].map(() => {
    const h = harness(e.handler);
    return runImport(deps(db, h, env), { concurrency: 3 }).then((s) => ({ s, h }));
  }));
  const day = runs[0].s.day;
  const made = runs.reduce((a, r) => a + r.h.searches().length, 0);
  assert.equal(made, e.n());
  assert.ok(made <= 500, `${made} searches against a 500 cap`);
  assert.equal(db.days.get(day), made, "reservations == calls");
  assert.ok(made >= 450, "the cap is used, not left idle");
  for (const r of runs) assert.ok(r.s.searches <= 400);
  // a later run the same day sees what is left
  const later = harness(e.handler);
  const s = await runImport(deps(db, later, env));
  assert.equal(later.searches().length, 500 - made);
  assert.equal(s.plan.cap, 500 - made);
  // and once it is spent, nothing is called at all
  const none = harness(e.handler);
  await runImport(deps(db, none, env));
  assert.equal(none.searches().length, 0);
  assert.equal(none.tokens().length, 0, "no token is fetched for a run with nothing to do");
});

test("run: the day rolls over in Pacific time, with a fresh counter", async () => {
  const e = ebay();
  const db = fakeDb(MANY(5));
  const h = harness(e.handler);
  const env = { EBAY_DAILY_CAP: "60", EBAY_RUN_CAP: "60" };
  const a = await runImport(deps(db, h, env), { concurrency: 1 });
  assert.equal(a.day, "2026-10-06");
  assert.equal(a.plan.calls, 58, "a feed that does not fit is not bought");
  assert.equal(a.usedAfter, 58);
  h.clock.t = Date.parse("2026-10-07T07:00:01Z"); // midnight Pacific has passed
  const b = await runImport(deps(db, h, env), { concurrency: 1, force: true }); // force: the feeds the first run stored are only minutes old
  assert.equal(b.day, "2026-10-07");
  assert.equal(b.usedBefore, 0);
  assert.equal(b.searches, 58);
  assert.equal(db.days.get("2026-10-06"), 58);
  assert.equal(db.days.get("2026-10-07"), 58);
});

test("run: a 429 stops the whole run, keeps the previous rows, and says so", async () => {
  const e = ebay({ onSearch: (n) => (n >= 30 ? json({ errors: [{ message: "too many" }] }, 429, { "retry-after": "60" }) : undefined) });
  const h = harness(e.handler);
  const db = fakeDb(MANY(40));
  db.feeds.set("EBAY_US|set:cel30", { items: [{ id: "old", title: "old", imageUrl: "https://i.ebayimg.com/x", price: { value: "1.00", currency: "USD" }, url: "https://www.ebay.com/itm/1" }], fetchedAt: new Date(NOW - 3600_000) });
  const s = await runImport(deps(db, h), { concurrency: 3 });
  assert.equal(s.stopped, "rate-limited");
  assert.ok(h.searches().length <= 30 + 3, `${h.searches().length} searches after a 429`);
  assert.equal(db.days.get(s.day), h.searches().length);
  assert.equal(db.feeds.get("EBAY_US|set:cel30")!.items[0].id, "old", "a feed the run never refreshed keeps its rows");
  assert.ok(s.feedsRefreshed < s.feedsPlanned);
  assert.ok(runReport(s).join("\n").includes("rate-limited"));
});

test("run: a token failure stops before any search and reports only eBay's OAuth category", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? new Response(JSON.stringify({ error: "invalid_client", error_description: "secret-ish client authentication failed" }), { status: 401 }) : json({})));
  const db = fakeDb(MANY(10));
  const s = await runImport(deps(db, h), {});
  assert.equal(s.stopped, "token");
  assert.equal(s.tokenError, "token-http-401:invalid_client");
  assert.equal(h.searches().length, 0);
  assert.equal(db.days.size, 0, "no budget spent");
  const text = JSON.stringify(s.tokenError) + runReport(s).join("\n");
  assert.ok(!/secret-ish|SECRET|DexComp-/.test(text));
});

test("run: retries once on a 5xx or a timeout, and once without the price filter on a 400; each retry is reserved", async () => {
  const seen: string[] = [];
  const e = ebay({
    onSearch: (n, url) => {
      seen.push(`${n}:${new URL(url).searchParams.get("filter")?.includes("price:[") ? "price" : "noprice"}`);
      if (n === 1) return json({}, 503);
      if (n === 3) return json({}, 400);
      return undefined;
    },
  });
  const h = harness(e.handler);
  const db = fakeDb(MANY(0));
  const s = await runImport(deps(db, h), { only: ["chase"], concurrency: 1 });
  assert.equal(s.retries, 2);
  assert.equal(h.searches().length, 40 + 2);
  assert.equal(db.days.get(s.day), 42);
  assert.ok(seen[2].endsWith("price") && seen[3].endsWith("noprice"), seen.slice(0, 5).join(" "));
  assert.equal(s.buckets.chase.refreshed, 5);
  // a second 5xx for the same search is a failure of that search only
  const e2 = ebay({ onSearch: (n) => (n <= 2 ? json({}, 500) : undefined) });
  const h2 = harness(e2.handler);
  const s2 = await runImport(deps(fakeDb([]), h2), { only: ["chase"], concurrency: 1 });
  assert.equal(s2.buckets.chase.refreshed, 5, "the feed is still built from its other searches");
  // a network failure also retries once
  let k = 0;
  const h3 = harness((url) => (url.includes("/oauth2/token") ? okToken() : (++k === 1 ? (() => { throw new Error("socket"); })() : ebay().handler(url, undefined, 0))));
  const s3 = await runImport(deps(fakeDb([]), h3), { only: ["chase"], concurrency: 1 });
  assert.equal(s3.retries, 1);
});

// ─── circuit breaker, fresh feeds, stop inside a feed (review F1, F8, SEC-11) ────

test("breaker: a 403 on a search (no Buy API access) stops the run at once and reports only the code", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({ errors: [{ message: "Insufficient permissions to fulfill the request. secret-ish" }] }, 403)));
  const db = fakeDb(MANY(200));
  const s = await runImport(deps(db, h), { concurrency: 3 });
  assert.equal(s.stopped, "forbidden");
  assert.equal(s.tokenError, "search-http-403");
  assert.ok(h.searches().length <= 3, `${h.searches().length} searches after the first refusal (3 workers in flight)`);
  assert.equal(db.days.get(s.day), h.searches().length);
  assert.equal(s.feedsRefreshed, 0);
  assert.ok(!runReport(s).join("\n").includes("secret-ish"));
});

test("breaker: a 401 that survives the token refresh is also 'forbidden'", async () => {
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({}, 401)));
  const s = await runImport(deps(fakeDb(MANY(50)), h), { concurrency: 1 });
  assert.equal(s.stopped, "forbidden");
  assert.ok(h.searches().length <= 3);
});

test("breaker: 6 searches in a row that fail (400/5xx/malformed/warned-empty) stop the run, with the error category only; a success in between resets the count", async () => {
  assert.equal(BREAKER_FAILURES, 6);
  for (const mode of ["500", "400", "malformed", "warning"] as const) {
    const h = harness((url) => {
      if (url.includes("/oauth2/token")) return okToken();
      if (mode === "malformed") return new Response("<html>not json secret-ish</html>", { status: 200 });
      if (mode === "warning") return json({ total: 0, warnings: [{ errorId: 12006, message: "secret-ish" }] });
      return json({ errors: [{ message: "secret-ish" }] }, Number(mode));
    });
    const db = fakeDb(MANY(300));
    const s = await runImport(deps(db, h), { concurrency: 1 });
    assert.equal(s.stopped, "failing", mode);
    assert.ok(h.searches().length <= BREAKER_FAILURES * 2 + 2, `${mode}: ${h.searches().length} searches`); // each failure may have one retry; far from the run cap
    assert.equal(db.days.get(s.day), h.searches().length, "the counter equals the calls made");
    assert.match(s.tokenError ?? "", /^search-(http-\d+|malformed|warning)$/, "only the error category");
    assert.ok(!runReport(s).join("\n").includes("secret-ish"));
  }
  // alternating failure and success never reaches 6 in a row
  const e = ebay({ onSearch: (n) => (n % 6 !== 0 ? json({ errors: [] }, 404) : undefined) }); // 5 failures, then a success, again and again
  const h2 = harness(e.handler);
  const s2 = await runImport(deps(fakeDb(MANY(0)), h2), { only: ["chase", "sealed", "types"], concurrency: 1 });
  assert.notEqual(s2.stopped, "failing");
  assert.ok(h2.searches().length >= 30, "ran past several cycles of 5 failures");
});

test(`breaker: ${BREAKER_EMPTY} searches in a row with no listings at all stop the run (HTTP 200, nothing in itemSummaries, no warning)`, async () => {
  assert.equal(BREAKER_EMPTY, 30);
  const h = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({ total: 0 })));
  const db = fakeDb(MANY(300));
  const s = await runImport(deps(db, h), { concurrency: 1 });
  assert.equal(s.stopped, "empty");
  assert.equal(h.searches().length, BREAKER_EMPTY);
  assert.equal(db.days.get(s.day), BREAKER_EMPTY);
  // some empties between good answers do not trip it
  const e = ebay({ onSearch: (n) => (n % 3 === 0 ? json({ total: 0 }) : undefined) });
  const s2 = await runImport(deps(fakeDb(MANY(0)), harness(e.handler)), { only: ["chase", "sealed"], concurrency: 1 });
  assert.equal(s2.stopped, null);
});

test("the retry allowance running out is reported as 'retries', not 'cap'", async () => {
  // every 2nd search fails once and succeeds on the retry: retries are 1 per 2 calls, far above the 5% allowance
  let n = 0;
  const e = ebay({ onSearch: () => (++n % 2 === 1 ? json({}, 503) : undefined) });
  const s = await runImport(deps(fakeDb(MANY(0)), harness(e.handler)), { only: ["chase", "sealed", "types"], concurrency: 1 });
  assert.equal(s.stopped, "retries");
});

test("after a 429 no worker starts another search for the feed it is in (chase feeds hold 8 searches)", async () => {
  const e = ebay({ onSearch: (n) => (n === 1 ? json({}, 429, { "retry-after": "60" }) : undefined) });
  const h = harness(e.handler);
  const s = await runImport(deps(fakeDb(MANY(0)), h), { only: ["chase"], concurrency: 3 });
  assert.equal(s.stopped, "rate-limited");
  assert.ok(h.searches().length <= 3 + 2, `${h.searches().length} searches after a 429 on the first`);
});

test("fresh feeds are not bought again (a re-run, an overlapping run, a retry after a crash) unless forced; stale ones are", async () => {
  const db = fakeDb(MANY(30));
  const e = ebay();
  const first = await runImport(deps(db, harness(e.handler)), { concurrency: 3 });
  assert.equal(first.searches, 265 + 30);
  // the same instant again: every feed that has rows is fresh and is not bought again (only feeds that came back empty are tried again)
  const h2 = harness(e.handler);
  const again = await runImport(deps(db, h2), { concurrency: 3 });
  const stored = first.buckets.chase.refreshed + first.buckets.sealed.refreshed + first.buckets.types.refreshed + first.buckets.sets.refreshed + first.buckets.items.refreshed;
  assert.equal(again.buckets.chase.fresh, 5);
  assert.equal(again.buckets.items.fresh, 30);
  assert.equal(again.buckets.items.refreshed, 0);
  assert.equal(again.buckets.chase.refreshed, 0);
  assert.ok(h2.searches().length < 295 && stored >= 185, `${h2.searches().length} searches the second time, ${stored} feeds stored the first`);
  assert.equal(again.plan.items.coreCovered, again.plan.items.core, "fresh item feeds still count as covered");
  assert.ok(runReport(again).join("\n").includes("Fresh (not bought)"));
  // forced: everything again
  const h3 = harness(e.handler);
  await runImport(deps(db, h3), { concurrency: 3, force: true });
  assert.equal(h3.searches().length, 295);
  // the window is 2 hours (a quarter of the bound at most): 1.9 h on a feed is still fresh, 2.1 h on it is bought again
  assert.equal(freshWindowMs({}), hoursToMs(2));
  assert.equal(freshWindowMs({ EBAY_LISTING_MAX_AGE_HOURS: "5.5" }), hoursToMs(1.375), "compliant mode: a quarter of 5.5 h");
  assert.equal(freshWindowMs({ EBAY_LISTING_MAX_AGE_HOURS: "72" }), hoursToMs(2), "never more than 2 h");
  const h3b = harness(e.handler);
  h3b.clock.t = NOW + 1.9 * 3600_000;
  const soon = await runImport(deps(db, h3b), { concurrency: 3 });
  assert.equal(soon.buckets.chase.fresh, 5);
  assert.ok(h3b.searches().length < 295, "an accidental re-dispatch within 2 h re-buys nothing that has rows");
  const h4 = harness(e.handler);
  h4.clock.t = NOW + 3 * 3600_000 + 1;
  db.feeds.forEach((v) => (v.fetchedAt = new Date(NOW))); // as the forced run left them
  const later = await runImport(deps(db, h4), { concurrency: 3 });
  assert.equal(h4.searches().length, 295);
  assert.equal(later.buckets.chase.fresh, 0);
  // a feed fresher than the share is skipped and the budget goes further down the plan instead
  const db2 = fakeDb(MANY(30));
  for (const f of fixedFeeds(TODAY)) db2.feeds.set(f.feed, { items: [{ id: "o", title: "o", imageUrl: "https://i.ebayimg.com/x", price: { value: "1.00", currency: "USD" }, url: "https://www.ebay.com/itm/1" }], fetchedAt: new Date(NOW - 3600_000) });
  const h5 = harness(e.handler);
  const s5 = await runImport(deps(db2, h5, { EBAY_RUN_CAP: "20" }), { concurrency: 1 });
  assert.equal(s5.buckets.items.refreshed, 20, "the cap is spent on item feeds, not on feeds that are an hour old");
  assert.equal(s5.buckets.chase.refreshed, 0);
  // compliant mode (bound 5.5 h): the window is 1.4 h, so a 4-hourly run always buys again
  const db3 = fakeDb(MANY(0));
  await runImport(deps(db3, harness(e.handler)), { only: ["chase"], concurrency: 3 });
  const h6 = harness(e.handler);
  h6.clock.t = NOW + 4 * 3600_000;
  const s6 = await runImport(deps(db3, h6, { EBAY_LISTING_MAX_AGE_HOURS: "5.5" }), { only: ["chase"], concurrency: 3 });
  assert.equal(s6.buckets.chase.fresh, 0);
  assert.equal(s6.buckets.chase.refreshed, 5);
});

test("strict caps: EBAY_RUN_CAP and --max-calls bound the searches of a run INCLUDING retries; three workers never overshoot", async () => {
  // --max-calls 10 against a mock that fails every search once: retries come out of the 10, not on top of it
  const flaky = () => {
    let n = 0;
    return ebay({ onSearch: () => (++n % 2 === 1 ? json({}, 503) : undefined) });
  };
  for (const concurrency of [1, 3]) {
    const h = harness(flaky().handler);
    const db = fakeDb(MANY(0));
    const s = await runImport(deps(db, h), { only: ["chase"], maxCalls: 10, concurrency });
    assert.ok(h.searches().length <= 10, `concurrency ${concurrency}: ${h.searches().length} searches under --max-calls 10`);
    assert.equal(s.searches, h.searches().length);
    assert.equal(db.days.get(s.day), h.searches().length, "the counter equals the calls made");
  }
  // EBAY_RUN_CAP=50 with every 5th search failing once: exactly 50 searches, retries included
  let k = 0;
  const e = ebay({ onSearch: () => (++k % 5 === 0 ? json({}, 500) : undefined) });
  for (const concurrency of [1, 3]) {
    k = 0;
    const h = harness(e.handler);
    const s = await runImport(deps(fakeDb(MANY(100)), h, { EBAY_RUN_CAP: "50" }), { concurrency });
    assert.ok(h.searches().length <= 50, `concurrency ${concurrency}: ${h.searches().length} searches under EBAY_RUN_CAP=50`);
    assert.equal(s.plan.cap, 50);
    assert.ok(s.stopped === "cap" || s.stopped === "retries", String(s.stopped)); // whichever bound is reached first
    assert.equal(s.searches, h.searches().length);
  }
  // the repeat after a 401 is inside the cap too
  const h401 = harness((url, init) => {
    if (url.includes("/oauth2/token")) return okToken();
    return json({}, 401);
  });
  const s401 = await runImport(deps(fakeDb(MANY(0)), h401), { only: ["chase"], maxCalls: 4, concurrency: 1 });
  assert.ok(h401.searches().length <= 4);
  void s401;
});

test("the importer says what it will do with today's budget BEFORE the first search, and logs its running total against the caps", async () => {
  const lines: string[] = [];
  const e = ebay();
  const db = fakeDb(MANY(40));
  const day = budgetDay(NOW);
  db.days.set(day, 640); // a manual run earlier in the Pacific day
  const h = harness(e.handler);
  const first = { searched: false };
  const fetch0 = h.deps.fetch;
  h.deps.fetch = async (u, i) => {
    if (u.includes("/item_summary/search") && !first.searched) {
      first.searched = true;
      assert.ok(lines.some((l) => /Budget day 2026-10-0\d/.test(l)), "the budget was printed before the first search");
    }
    return fetch0(u, i);
  };
  const s = await runImport({ db, api: h.deps, env: {}, log: (l) => lines.push(l) }, { concurrency: 3, maxCalls: 300 });
  const text = lines.join("\n");
  assert.match(text, /Budget day \d{4}-\d{2}-\d{2} \(the Pacific day/);
  assert.match(text, /reserved so far today: 640 of the 2,400 daily cap \(1,760 left\)/);
  assert.match(text, /at most 300 searches, retries included \(the smallest of: run cap 2,000, 1,760 left of today's 2,400, --max-calls 300\)/);
  assert.match(text, /Plan: \d+ feeds in 300 searches \(chase 5 feeds\/40 calls/);
  assert.match(text, /stops early on a 429, a 401\/403 on a search, 6 failed searches in a row, or 30 with no listings in a row/);
  assert.match(text, /another application on the same eBay keyset is invisible/);
  assert.ok(!/SECRET|DexComp-|Bearer/.test(text));
  assert.equal(s.searches, 300);
  // the running total against the caps, every PROGRESS_EVERY searches
  assert.equal(PROGRESS_EVERY, 250);
  const progress = lines.filter((l) => l.startsWith("progress:"));
  assert.equal(progress.length, 1);
  assert.match(progress[0], /^progress: 250 searches this run \(\d+ retries, run cap 300\); 890 of the 2,400 daily cap used today; \d+ feeds refreshed\.$/);
  // nothing left today: it says so
  const spent = fakeDb(MANY(10));
  spent.days.set(day, 2400);
  const lines2: string[] = [];
  const s2 = await runImport({ db: spent, api: harness(e.handler).deps, env: {}, log: (l) => lines2.push(l) }, {});
  assert.equal(s2.searches, 0);
  assert.match(lines2.join("\n"), /at most 0 searches.*Nothing to do: the budget for today is spent/);
  // a dry run prints the same, and is marked
  const lines3: string[] = [];
  await runImport({ db: fakeDb(MANY(10)), api: harness(e.handler).deps, env: {}, log: (l) => lines3.push(l) }, { dryRun: true });
  assert.match(lines3[0], /^DRY RUN \(no eBay call, no database write\)\. Budget day/);
  assert.equal(startReport(s2, { force: true, freshMs: hoursToMs(2) }).join("\n").includes("--force"), true);
});

test("each feed asks eBay for its own affiliateReferenceId (dex-<market>-<kind>) and the stored links keep eBay's URL as returned", async () => {
  const refs = new Map<string, Set<string>>();
  const e = ebay();
  const h = harness((url, init) => {
    if (!url.includes("/item_summary/search")) return e.handler(url, init, 0);
    const hd = init?.headers as Record<string, string>;
    const set = refs.get(hd["X-EBAY-C-MARKETPLACE-ID"]) ?? new Set<string>();
    set.add(requestedReference(init)!);
    refs.set(hd["X-EBAY-C-MARKETPLACE-ID"], set);
    return e.handler(url, init, 0);
  });
  const db = fakeDb(MANY(40));
  await runImport(deps(db, h), { concurrency: 1 });
  assert.deepEqual([...(refs.get("EBAY_US") ?? [])].sort(), ["dex-us-chase", "dex-us-item", "dex-us-sealed", "dex-us-set", "dex-us-type"]);
  assert.deepEqual([...(refs.get("EBAY_AU") ?? [])].sort(), ["dex-au-chase", "dex-au-sealed", "dex-au-set", "dex-au-type"].concat(refs.get("EBAY_AU")?.has("dex-au-item") ? ["dex-au-item"] : []).sort());
  for (const [feed, v] of db.feeds) {
    const kind = feed.split("|")[1].split(":")[0];
    const mp = { EBAY_US: "us", EBAY_AU: "au", EBAY_GB: "uk", EBAY_CA: "ca", EBAY_DE: "eu" }[feed.split("|")[0] as "EBAY_US"];
    for (const it of v.items) assert.equal(new URL(it.url).searchParams.get("customid"), `dex-${mp}-${kind}`, `${feed}: the URL is eBay's, with the feed's sub-id`);
  }
  assert.ok(db.feeds.size > 100);
});

test("replaceFeed's advisory lock and UTC timestamps are in the SQL (source check: the SQL itself runs against Postgres in the verification)", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/ebay-store.ts", import.meta.url), "utf8");
  assert.match(src, /pg_advisory_xact_lock\(hashtext\(\$\{feed\}\)\)/);
  assert.equal((src.match(/utcTimestamp\(/g) ?? []).length >= 2, true);
  const t = (await import("../src/lib/pg-time")).utcTimestamp(new Date("2026-10-07T06:37:00Z"));
  assert.match(t.sql, /::timestamptz AT TIME ZONE 'UTC'/);
  assert.deepEqual(t.values, ["2026-10-07T06:37:00.000Z"]);
});

test("run: a feed's rows are REPLACED (never appended); an empty or failed refresh keeps the old rows; a refresh failure of one feed does not stop the rest", async () => {
  const rows = [planRow("etb", "US", 6000, { id: "etb-us", name: "Surging Sparks Elite Trainer Box" }), planRow("etb", "US", 7000, { id: "etb-none", name: "Prismatic Evolutions Elite Trainer Box" })];
  const db = fakeDb(rows);
  const old = (id: string) => ({ items: [{ id, title: "old", imageUrl: "https://i.ebayimg.com/x", price: { value: "1.00", currency: "USD" }, url: "https://www.ebay.com/itm/1" }], fetchedAt: new Date(NOW - 20 * 3600_000) });
  db.feeds.set("EBAY_US|item:etb-us", old("a"));
  db.feeds.set("EBAY_US|item:etb-none", old("b"));
  const handler: Handler = (url) => {
    if (url.includes("/oauth2/token")) return okToken();
    const q = new URL(url).searchParams.get("q") ?? "";
    if (q.includes("Prismatic")) return json({ itemSummaries: [summary("1", "Pokemon Japanese Prismatic Evolutions Elite Trainer Box", 80), summary("2", "Prismatic Evolutions EMPTY box", 80)] }); // nothing relevant
    return json({ itemSummaries: [summary("11", "Pokemon TCG Surging Sparks Elite Trainer Box Sealed", 90), summary("12", "Pokemon Surging Sparks Elite Trainer Box NEW", 70)] });
  };
  const h = harness(handler);
  const s = await runImport(deps(db, h), { only: ["items"], concurrency: 1 });
  const fresh = db.feeds.get("EBAY_US|item:etb-us")!;
  assert.deepEqual(fresh.items.map((i) => i.price.value), ["70.00", "90.00"], "replaced, lowest price first");
  assert.equal(fresh.fetchedAt.getTime(), NOW);
  assert.equal(db.feeds.get("EBAY_US|item:etb-none")!.items[0].id, "b", "an empty result keeps the old rows");
  assert.equal(s.buckets.items.emptied, 1);
  assert.equal(s.buckets.items.refreshed, 1);
  // every search of a feed failing keeps the rows too
  const h2 = harness((url) => (url.includes("/oauth2/token") ? okToken() : json({}, 500)));
  const db2 = fakeDb(rows);
  db2.feeds.set("EBAY_US|item:etb-us", old("a"));
  const s2 = await runImport(deps(db2, h2), { only: ["items"], concurrency: 1 });
  assert.equal(db2.feeds.get("EBAY_US|item:etb-us")!.items[0].id, "a");
  assert.equal(s2.buckets.items.failed, 2);
  // a database failure on one feed is that feed's failure only
  const db3 = fakeDb(rows, { failReplace: (f) => f.includes("etb-us") });
  const e3 = ebay();
  const s3 = await runImport(deps(db3, harness(e3.handler)), { only: ["items"], concurrency: 1 });
  assert.equal(s3.buckets.items.failed, 1);
});

test("run: the purge deletes rows older than the bound + 4 h (26 + 4 by default, 5.5 + 4 in compliant mode), at the start and the end", async () => {
  const mk = (ageH: number) => ({ items: [{ id: "x", title: "x", imageUrl: "https://i.ebayimg.com/x", price: { value: "1.00", currency: "USD" }, url: "https://www.ebay.com/itm/1" }], fetchedAt: new Date(NOW - ageH * 3600_000) });
  const db = fakeDb([]);
  db.feeds.set("old", mk(31));
  db.feeds.set("edge", mk(29));
  db.feeds.set("fresh", mk(2));
  const s = await runImport(deps(db, harness(ebay().handler)), { dryRun: false, only: ["chase"], maxCalls: 0 });
  assert.ok(!db.feeds.has("old") && db.feeds.has("edge") && db.feeds.has("fresh"));
  assert.equal(s.purged, 1);
  const strict = fakeDb([]);
  strict.feeds.set("a", mk(10));
  strict.feeds.set("b", mk(9));
  await runImport(deps(strict, harness(ebay().handler), { EBAY_LISTING_MAX_AGE_HOURS: "5.5" }), { maxCalls: 0 });
  assert.ok(!strict.feeds.has("a") && strict.feeds.has("b"));
  assert.ok(strict.purges.every((c) => c.getTime() === NOW - hoursToMs(9.5)));
});

test("run: a dry run makes no call and writes nothing", async () => {
  const e = ebay();
  const h = harness(e.handler);
  const db = fakeDb(MANY(30));
  const s = await runImport(deps(db, h), { dryRun: true });
  assert.equal(h.calls.length, 0);
  assert.equal(db.ensured, 0);
  assert.equal(db.purges.length, 0);
  assert.equal(db.days.size, 0);
  assert.equal(db.feeds.size, 0);
  assert.equal(s.plan.calls, 265 + 30);
  assert.ok(runReport(s).join("\n").startsWith("DRY RUN"));
});

test("selectFeedItems: each rule keeps what it should, and an item feed keeps 8 at most", () => {
  const feed = (kind: "item" | "chase") => ({ ...fixedFeeds(TODAY)[0], rule: kind === "chase" ? { kind: "chase" as const } : { kind: "item" as const, target: { groupKey: "sv8|etb", type: "etb" as const, setCode: "sv8" } }, marketplace: "EBAY_US" as const });
  const etbs = Array.from({ length: 20 }, (_, i) => summary(String(i), `Pokemon TCG Surging Sparks Elite Trainer Box Sealed #${i}`, 100 - i));
  const out = selectFeedItems(feed("item"), [etbs], NOW);
  assert.equal(out.length, 8);
  assert.deepEqual(out.map((o) => Number(o.price.value)), [81, 82, 83, 84, 85, 86, 87, 88]);
  assert.deepEqual(selectFeedItems(feed("chase"), [etbs], NOW), []);
  assert.deepEqual(selectFeedItems(feed("item"), [], NOW), []);
});

test("reports: counts and ages only, no titles or prices", async () => {
  const e = ebay();
  const s = await runImport(deps(fakeDb(MANY(20)), harness(e.handler)), { only: ["chase", "items"] });
  const text = runReport(s).join("\n");
  assert.match(text, /Calls today: \d+/);
  assert.match(text, /Oldest row/);
  assert.match(text, /Item feeds in the database/);
  assert.ok(!/Special Illustration|A\$|US\$|\$\d/.test(text.replace(/US\$\d+/g, "")));
});

test("DEPLOY.md says what the owner must know: both prongs of 8.1(c), the whole switch, the shared keyset, the reporting granularity", async () => {
  const { readFileSync } = await import("node:fs");
  const doc = readFileSync(new URL("../DEPLOY.md", import.meta.url), "utf8");
  const wf = readFileSync(new URL("../../../.github/workflows/dexcompare-ebay-import.yml", import.meta.url), "utf8");
  // both prongs of the Age clause, quoted, with the section as the live agreement numbers it
  for (const needle of ["8.1(c)", "Age of Displayed eBay Content", "six (6) hours older than information displayed on the eBay Site", "twenty-four (24) hours older than content displayed on the eBay Site", "how much older your displayed item listing is", "8.1(b)(1)", "3.1(b)"]) assert.ok(doc.includes(needle), `DEPLOY.md quotes ${needle}`);
  // the switch: cron + the age variable (GitHub and Vercel) + the run cap; the copy follows by itself
  for (const needle of ['"37 8 * * *"', '"13 */4 * * *"', "EBAY_LISTING_MAX_AGE_HOURS=5.5", "EBAY_RUN_CAP", "380", "follows the bound by itself"]) assert.ok(doc.includes(needle), `DEPLOY.md's switch says ${needle}`);
  assert.ok(wf.includes('cron: "37 8 * * *"') && wf.includes("13 */4 * * *") && wf.includes("EBAY_RUN_CAP = 380"));
  // the shared keyset, prominently (before the first subsection), with both remedies
  const head = doc.slice(doc.indexOf("## eBay listings: the daily import"), doc.indexOf("### Why daily"));
  assert.match(head, /READ THIS FIRST/);
  assert.match(head, /separate eBay application/);
  assert.match(head, /EBAY_DAILY_CAP/);
  assert.match(head, /BOTH sites/);
  // what EPN reports for listing tiles
  for (const needle of ["dex-us-chase", "dex-au-item", "affiliateReferenceId", "exactly as returned"]) assert.ok(doc.includes(needle), `DEPLOY.md explains ${needle}`);
  // the numbers the code enforces appear in the doc as they are
  assert.ok(doc.includes(`**${BREAKER_FAILURES} searches in a row that fail**`) && doc.includes(`${BREAKER_EMPTY} in a row that come back with no listings`));
  assert.ok(doc.includes("less than 2 hours old") && doc.includes("strict upper bound"));
});
