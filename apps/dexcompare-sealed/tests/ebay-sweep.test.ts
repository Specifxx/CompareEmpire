import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchUrl } from "../src/lib/ebay-api";
import { runImport } from "../src/lib/ebay-import";
import {
  buildSweepIndex,
  isFiller,
  marketplaceShares,
  matchListing,
  SWEEP_PAGE,
  SWEEP_QUERIES,
  SweepCollector,
  sweepMarketplace,
  sweepSpec,
  sweepVocabulary,
} from "../src/lib/ebay-sweep";
import type { PlanRow } from "../src/lib/ebay-store";
import { fakeDb, harness, json, NOW, okToken, planRow, requestedReference, summary, withReference } from "./helpers/ebay-fakes";

// A small catalogue, as the store import files it (the real classifier makes the group keys).
function catalogue(): PlanRow[] {
  return [
    planRow("booster-box", "US", 16000, { name: "Surging Sparks Booster Box", productId: "bb" }),
    planRow("etb", "US", 5000, { name: "Surging Sparks Elite Trainer Box", productId: "etb" }),
    planRow("collection", "US", 4000, { name: "Charizard ex Premium Collection", productId: "chz" }),
    planRow("collection", "US", 12000, { name: "Charizard ex Super-Premium Collection", productId: "chz-super" }),
    planRow("tin", "US", 2000, { name: "151 - Mini Tin - Slowpoke & Sandshrew", productId: "tin-slow" }),
    planRow("tin", "US", 2000, { name: "151 - Mini Tin - Scyther & Weezing", productId: "tin-scy" }),
    planRow("blister", "US", 1500, { name: "Surging Sparks - 3 Pack Blister - Quagsire", productId: "bl-q" }),
    planRow("booster-pack", "US", 500, { name: "Surging Sparks Booster Pack", productId: "pack" }),
    planRow("etb", "AU", 9000, { name: "Surging Sparks Elite Trainer Box", productId: "etb" }),
  ];
}

const usIndex = () => {
  const rows = catalogue();
  return buildSweepIndex(rows, "EBAY_US", sweepVocabulary(rows));
};
const hit = (title: string) => {
  const m = matchListing(title, usIndex());
  return "product" in m ? m.product.productId : m.miss;
};

test("sweep matching: set products by their group key, whatever the seller adds", () => {
  assert.equal(hit("Pokemon TCG Surging Sparks Booster Box 36 Packs Factory Sealed FAST SHIP"), "bb");
  assert.equal(hit("IN HAND Pokemon Scarlet & Violet Surging Sparks Elite Trainer Box ETB Sealed"), "etb");
  assert.equal(hit("Pokemon Surging Sparks Sleeved Booster Pack Sealed"), "no-product", "a sleeved booster is not the plain pack product");
  assert.equal(hit("Pokemon Prismatic Evolutions Booster Bundle Sealed"), "no-product", "a product this marketplace does not list");
});

test("sweep matching: a collection, tin or blister needs all its words, and nothing that names another product", () => {
  assert.equal(hit("Pokemon TCG Charizard ex Premium Collection Box NEW SEALED"), "chz");
  assert.equal(hit("Pokemon Charizard ex Super Premium Collection Sealed"), "chz-super", "the most specific product wins");
  assert.equal(hit("Pokemon 151 Mini Tin Slowpoke Sandshrew Factory Sealed"), "tin-slow");
  assert.equal(hit("Pokemon TCG Scarlet & Violet 151 Mini Tin Scyther & Weezing 2 Packs"), "tin-scy");
  assert.equal(hit("Pokemon Surging Sparks 3 Pack Blister Quagsire Promo Coin Holo"), "bl-q", "promo-card words are filler");
  assert.equal(hit("Pokemon 151 Mini Tin Slowpoke Sandshrew Scyther"), "no-product", "a word that names another product makes it not this one");
  assert.equal(hit("Pokemon 151 Mini Tin"), "no-product", "no identifying word: which tin?");
});

test("sweep matching: lots, several units, random variants, Japanese naming and damage are never handed to a product", () => {
  for (const t of [
    "Pokemon TCG 151 Mini Tins (10-Pack) Slowpoke Sandshrew SEALED",
    "Pokemon 151 Mini Tin Slowpoke Sandshrew Full Set",
    "Pokemon 151 Mini Tin - One Variation Chosen At Random",
    "Pokemon Surging Sparks Booster Box x2 Sealed",
    "Pokemon Card Game MEGA Expansion Pack Surging Sparks Box",
    "Pokemon Surging Sparks Booster Box Sealed READ (DAMAGE)",
    "Pokemon Surging Sparks Booster Box Presale",
    "Japanese Pokemon Surging Sparks Booster Box",
    "Pokemon Surging Sparks Booster Box EMPTY",
  ])
    assert.equal(hit(t), "rejected", t);
});

test("filler: seller and shipping words and set-name words are filler; the words that tell products apart never are", () => {
  for (const w of ["fast", "nib", "coin", "holo", "express", "spc", "surging", "sparks", "black", "bolt"]) assert.ok(isFiller(w), w);
  for (const w of ["mini", "super", "ex", "mega", "charizard", "pikachu", "slowpoke"]) assert.ok(!isFiller(w), w);
});

test("collector: keeps lowest price first, de-duplicated, at most 8; refuses used, under-floor and unmatched listings; counts why", () => {
  const c = new SweepCollector(usIndex(), NOW);
  const page = [
    summary("1", "Pokemon Surging Sparks Booster Box Sealed", 150),
    summary("2", "Pokemon Surging Sparks Booster Box Sealed", 140),
    summary("2", "Pokemon Surging Sparks Booster Box Sealed", 140), // the same listing twice
    summary("3", "Pokemon Surging Sparks Booster Box Sealed", 20), // under the booster box floor
    summary("4", "Pokemon Surging Sparks Booster Box Sealed", 160, "EBAY_US", { condition: "Used" }),
    summary("5", "Pokemon Mystery Lot of cards", 50),
    summary("6", "Pokemon Charizard ex Premium Collection", 45),
  ];
  const gain = c.addPage(page);
  assert.equal(gain, 3);
  const feeds = c.feeds();
  assert.deepEqual(feeds.get("bb")!.map((i) => i.price.value), ["140.00", "150.00"]);
  assert.equal(feeds.get("chz")!.length, 1);
  assert.equal(c.stats.miss.floor, 1);
  assert.equal(c.stats.miss.condition, 1);
  assert.equal(c.stats.miss.rejected, 1);
  assert.equal(c.stats.matched, 3);
});

test("paging: 200 a page with the offset, round-robin across queries, stops at the end, when dry, at the budget and at eBay's depth", async () => {
  const spec = sweepSpec(SWEEP_QUERIES[0], "EBAY_US", 400);
  const u = new URL(buildSearchUrl(spec));
  assert.equal(u.searchParams.get("limit"), "200");
  assert.equal(u.searchParams.get("offset"), "400");
  assert.equal(u.searchParams.get("q"), "Pokemon elite trainer box");
  assert.equal(new URL(buildSearchUrl(sweepSpec(SWEEP_QUERIES[0], "EBAY_US", 0))).searchParams.get("offset"), null);

  // query A: two good pages then the end (a short page); query B: always the same listings (dry after its minimum); query C: errors
  const queries = [
    { key: "a", q: "booster box", types: ["booster-box"] as const },
    { key: "b", q: "elite trainer box", types: ["etb"] as const },
    { key: "c", q: "tin", types: ["tin"] as const },
  ];
  const seen: string[] = [];
  const c = new SweepCollector(usIndex(), NOW);
  const progress = await sweepMarketplace(
    c,
    50,
    async (s) => {
      seen.push(`${s.q}@${s.offset ?? 0}`);
      if (s.q.endsWith("tin")) throw new Error("boom");
      if (s.q.endsWith("booster box")) {
        const n = (s.offset ?? 0) / SWEEP_PAGE;
        const items = Array.from({ length: n < 2 ? SWEEP_PAGE : 3 }, (_, i) => summary(`a${n}-${i}`, "Pokemon Surging Sparks Booster Box Sealed", 150 + i));
        return { items, total: 403 };
      }
      return { items: Array.from({ length: SWEEP_PAGE }, () => summary("b-same", "Pokemon Surging Sparks Elite Trainer Box", 60)), total: 9000 };
    },
    { concurrency: 1, queries, isFatal: () => false },
  );
  const by = Object.fromEntries(progress.map((p) => [p.key, p]));
  assert.equal(by.a.stopped, "end");
  assert.equal(by.a.pages, 3);
  assert.equal(by.b.stopped, "dry");
  assert.equal(by.b.pages, 3, "page 1 gains; pages 2 and 3 gain nothing: dry after two");
  assert.equal(by.c.stopped, "error");
  assert.ok(seen.indexOf("Pokemon booster box@200") > seen.indexOf("Pokemon elite trainer box@0"), "round-robin: every query's first page before anyone's second");

  // the budget ends it
  const tight = await sweepMarketplace(new SweepCollector(usIndex(), NOW), 2, async () => ({ items: Array.from({ length: SWEEP_PAGE }, (_, i) => summary(`x${Math.random()}-${i}`, "Pokemon Surging Sparks Booster Box", 150)), total: 100000 }), {
    concurrency: 2,
    queries: [queries[0]],
  });
  assert.equal(tight[0].pages, 2);
  assert.equal(tight[0].stopped, "budget");
});

test("shares: by product count, with a floor for a small marketplace, never more than the budget", () => {
  const rows = [...catalogue(), ...Array.from({ length: 30 }, (_, i) => planRow("tin", "CA", 2000, { name: `Tin - Pikachu ${i}`, productId: `ca${i}` }))];
  const vocab = sweepVocabulary(rows);
  const ix = (["EBAY_US", "EBAY_AU", "EBAY_CA"] as const).map((m) => buildSweepIndex(rows, m, vocab));
  const sh = marketplaceShares(ix, 1000);
  const total = [...sh.values()].reduce((a, b) => a + b, 0);
  assert.ok(total <= 1000);
  assert.ok(sh.get("EBAY_CA")! > sh.get("EBAY_US")!, "more products, more pages");
  assert.ok(sh.get("EBAY_AU")! >= 70, "the floor");
});

test("run: the sweep writes an item feed for every product with two or more listings, then per-product searches fill only what it missed", async () => {
  const rows = catalogue();
  const db = fakeDb(rows);
  const h = harness((url, init) => {
    if (url.includes("/oauth2/token")) return okToken();
    const u = new URL(url);
    const q = u.searchParams.get("q") ?? "";
    const offset = Number(u.searchParams.get("offset") ?? 0);
    const ref = requestedReference(init);
    if (q === "Pokemon booster box" && offset === 0)
      return json({ total: 3, itemSummaries: withReference([summary("s1", "Pokemon Surging Sparks Booster Box Sealed", 150), summary("s2", "Pokemon Surging Sparks Booster Box", 145), summary("s3", "Pokemon Surging Sparks Booster Box 36 packs", 155)], ref) });
    if (q === "Pokemon tin" && offset === 0)
      return json({ total: 2, itemSummaries: withReference([summary("t1", "Pokemon 151 Mini Tin Slowpoke Sandshrew", 25), summary("t2", "Pokemon 151 Mini Tin Slowpoke & Sandshrew Sealed", 22)], ref) });
    if (q.startsWith("Pokemon Surging Sparks Elite Trainer Box"))
      return json({ total: 2, itemSummaries: withReference([summary("e1", "Pokemon Surging Sparks Elite Trainer Box", 60), summary("e2", "Pokemon Surging Sparks Elite Trainer Box ETB", 58)], ref) });
    return json({ total: 0, itemSummaries: [] });
  });
  const logs: string[] = [];
  const s = await runImport({ db, api: h.deps, env: { EBAY_SWEEP_CALLS: "200" }, log: (l) => logs.push(l) }, { only: ["sweep", "items"] });
  assert.equal(s.stopped, null, logs.join("\n"));
  // the sweep covered the booster box and the tin in the US
  assert.ok(db.feeds.has("EBAY_US|item:bb"));
  assert.deepEqual(db.feeds.get("EBAY_US|item:bb")!.items.map((i) => i.price.value), ["145.00", "150.00", "155.00"]);
  assert.ok(db.feeds.has("EBAY_US|item:tin-slow"));
  assert.ok(!db.feeds.has("EBAY_US|item:tin-scy"), "nothing found: no feed");
  // the per-product search ran for the eligible ETB the sweep did not cover, and never for the box it did
  const itemSearches = h.searches().map((c) => new URL(c.url).searchParams.get("q"));
  assert.ok(itemSearches.some((q) => q?.startsWith("Pokemon Surging Sparks Elite Trainer Box")));
  assert.ok(!itemSearches.some((q) => q === "Pokemon Surging Sparks Booster Box"));
  assert.ok(db.feeds.has("EBAY_US|item:etb"));
  assert.equal(s.buckets.items.covered >= 1, true);
  // every sweep link is eBay's own, tagged with the item feed's reference
  for (const it of db.feeds.get("EBAY_US|item:bb")!.items) assert.equal(new URL(it.url).searchParams.get("customid"), "dex-us-item");
  // budget: every search reserved, never more than the cap
  assert.equal([...db.days.values()].reduce((a, b) => a + b, 0), h.searches().length);
  assert.ok(s.sweep.some((m) => m.marketplace === "EBAY_US" && m.written >= 2));
});

test("run: a 429 during the sweep stops the run, keeps what the sweep already found, and buys no per-product search", async () => {
  const rows = catalogue();
  const db = fakeDb(rows);
  let n = 0;
  const h = harness((url, init) => {
    if (url.includes("/oauth2/token")) return okToken();
    n++;
    if (n === 1) return json({ total: 2, itemSummaries: withReference([summary("e1", "Pokemon Surging Sparks Elite Trainer Box", 60), summary("e2", "Pokemon Surging Sparks Elite Trainer Box ETB", 58)], requestedReference(init)) });
    return json({ errors: [] }, 429, { "retry-after": "60" });
  });
  const s = await runImport({ db, api: h.deps, env: { EBAY_SWEEP_CALLS: "100" }, log: () => {} }, { only: ["sweep", "items"], concurrency: 1 });
  assert.equal(s.stopped, "rate-limited");
  assert.ok(db.feeds.has("EBAY_US|item:etb"), "the page that came back is written");
  assert.equal(s.buckets.items.planned, 0);
});
