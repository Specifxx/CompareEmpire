import { test } from "node:test";
import assert from "node:assert/strict";
import { distrustRead, dropLowOutliers, offerRef, pickName, planMoves, priceOf, rowsFromReads, sourcesFor, type StoreRead } from "../src/lib/importer";
import { readShopifyCollection } from "../src/lib/feeds";
import { headlineOffer, offerStock, openStoreCount, rankOffers, OFFER_STALE_MS } from "../src/lib/sealed-offers";
import type { FeedProduct } from "../src/lib/feeds";
import { STORES, TCGPLAYER, type StoreConfig } from "../src/lib/stores";

const store: StoreConfig = { key: "s1", name: "Store One", base: "https://s1.example", market: "AU", platform: "shopify", country: "AU", collections: ["pokemon"] };

function prod(id: string, title: string, variants: [number, boolean][]): FeedProduct {
  return { id, title, url: `https://s1.example/products/${id}`, imageUrl: null, currency: null, variants: variants.map(([priceCents, available]) => ({ priceCents, available })) };
}

test("price: cheapest AVAILABLE variant, never a sub-floor deposit variant", () => {
  const p = prod("a", "Surging Sparks Booster Box", [[100, true], [26995, true], [24995, false]]);
  assert.deepEqual(priceOf(p, 10500), { priceCents: 26995, inStock: true });
  const sold = prod("b", "Surging Sparks Booster Box", [[26995, false], [25995, false]]);
  assert.deepEqual(priceOf(sold, 10500), { priceCents: 25995, inStock: false });
  assert.equal(priceOf(prod("c", "x", [[500, true]]), 10500), null);
});

test("price: a multi-unit option is never the product's price", () => {
  const tin = prod("t", "Pokemon 30th Celebration Mini Tin", []);
  tin.variants = [
    { priceCents: 2995, available: false, title: "Single Tin" },
    { priceCents: 27999, available: true, title: "Display (10 Tins)" },
  ];
  assert.deepEqual(priceOf(tin, 600), { priceCents: 2995, inStock: false });
  const one = prod("o", "Pokemon Surging Sparks Booster Box", []);
  one.variants = [{ priceCents: 26995, available: true, title: "Default Title" }];
  assert.deepEqual(priceOf(one, 10500), { priceCents: 26995, inStock: true });
});

test("a store keeps its best listing per product: in stock beats cheaper-but-sold-out", () => {
  const rows = rowsFromReads(store, [
    {
      handle: "pokemon",
      ok: true,
      products: [
        prod("etb-1", "Pokémon Surging Sparks Elite Trainer Box", [[7995, false]]),
        prod("etb-2", "Surging Sparks ETB (Pikachu)", [[8995, true]]),
        prod("single", "Pikachu ex 238/191 Surging Sparks", [[5000, true]]),
      ],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].identity.groupKey, "sv8|etb");
  assert.equal(rows[0].priceCents, 8995);
  assert.equal(rows[0].inStock, true);
});

test("titles in a non-Pokémon collection must say Pokémon", () => {
  const rows = rowsFromReads(store, [
    { handle: "pre-orders", ok: true, products: [prod("x", "Surging Sparks Booster Box", [[26995, true]]), prod("y", "Pokemon Surging Sparks Booster Box", [[26995, true]])] },
  ]);
  assert.deepEqual(rows.map((r) => r.title), ["Pokemon Surging Sparks Booster Box"]);
});

test("in-stock listings far below the market median are dropped", () => {
  const mk = (key: string, price: number): StoreRead => ({
    store: { ...store, key },
    ok: true,
    error: null,
    products: 1,
    rediscovered: false,
    ms: 0,
    rows: rowsFromReads({ ...store, key }, [{ handle: "pokemon", ok: true, products: [prod("p", "Pokemon Charizard Ultra-Premium Collection", [[price, true]])] }]),
  });
  // A$89.95 against A$600+ for the same UPC: a mislisting. A$299.95 is a big
  // discount, but stores do sell old stock at old prices, so it stays.
  const reads = [mk("a", 59995), mk("b", 61995), mk("c", 64995), mk("d", 8995), mk("e", 29995)];
  assert.equal(dropLowOutliers(reads), 1);
  assert.equal(reads[3].rows.length, 0);
  assert.equal(reads[4].rows.length, 1);
});

test("stock states: stale rows are unknown and never the headline", () => {
  const now = Date.parse("2026-09-25T12:00:00Z");
  const fresh = new Date(now - 3600_000).toISOString();
  const stale = new Date(now - OFFER_STALE_MS - 1).toISOString();
  const offers = [
    { store: "a", priceCents: 100, inStock: true, lastSeen: stale },
    { store: "b", priceCents: 300, inStock: true, lastSeen: fresh },
    { store: "c", priceCents: 200, inStock: false, lastSeen: fresh },
  ];
  assert.equal(offerStock(offers[0], now), "unknown");
  assert.equal(headlineOffer(offers, now)?.store, "b");
  assert.equal(openStoreCount(offers, now), 1);
  assert.deepEqual(rankOffers(offers, now).map((o) => o.store), ["b", "a", "c"]);
});

test("a run reads TCGplayer too, first; --only tcgplayer and --only US include it", () => {
  const all = sourcesFor();
  assert.equal(all.length, STORES.length + 1);
  assert.equal(all[0].key, "tcgplayer");
  assert.deepEqual(sourcesFor(["tcgplayer"]).map((s) => s.key), ["tcgplayer"]);
  const us = sourcesFor(["US"]);
  assert.equal(us[0].key, "tcgplayer");
  assert.equal(us.length, STORES.filter((s) => s.market === "US").length + 1);
  assert.ok(!sourcesFor(["AU"]).some((s) => s.key === "tcgplayer"));
});

// ── products follow their listings to a new key (planMoves) ──────────────────

/** Stored offers: product id → its listings' refs ("unread…" refs are from a store not read this run). */
function stored(offers: Record<string, string[]>) {
  return Object.entries(offers).flatMap(([productId, refs]) => refs.map((ref) => ({ productId, ref, store: ref.startsWith("unread") ? "down" : "up" })));
}
const READ = new Set(["up"]);

test("moves: a product follows most of its listings to a key no product holds", () => {
  const existing = [{ id: "P", groupKey: "blister|-|2pack-discovery-neo" }];
  const prev = stored({ P: ["a", "b", "c"] });
  const now = new Map([["a", "blister|-|2pack-discovery-neo-unlimited"], ["b", "blister|-|2pack-discovery-neo-unlimited"], ["c", "blister|-|2pack-discovery-neo"]]);
  assert.deepEqual(planMoves(existing, prev, now, READ), [{ id: "P", from: "blister|-|2pack-discovery-neo", to: "blister|-|2pack-discovery-neo-unlimited" }]);
  // Half is not most; nor are listings of stores that weren't read this run.
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "c", "d"] }), now, READ), []);
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "unread1", "unread2", "unread3"] }), now, READ), []);
});

test("moves: a product whose listings all leave, split several ways, follows them instead of dying", () => {
  // The merged "First Partner Illustration Collection" splits into Series 1, 2 and 3.
  const existing = [{ id: "P", groupKey: "fpic", nameKey: "fpic-series3" }];
  const now = new Map([["a", "fpic-series1"], ["b", "fpic-series1"], ["c", "fpic-series3"], ["d", "fpic-series2"]]);
  // To the series its own name says, though Series 1 got more of its listings.
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "c", "d"] }), now, READ), [{ id: "P", from: "fpic", to: "fpic-series3" }]);
  // A name that says none of them: where most went.
  assert.deepEqual(planMoves([{ id: "P", groupKey: "fpic", nameKey: "fpic" }], stored({ P: ["a", "b", "c", "d"] }), now, READ), [{ id: "P", from: "fpic", to: "fpic-series1" }]);
  // Most of its listings went to a key another product holds: it keeps the rest, as its name says.
  assert.deepEqual(
    planMoves(
      [
        { id: "P", groupKey: "blister|-|espathra", nameKey: "blister|-|2pack-espathra" },
        { id: "T", groupKey: "blister|-|1pack-espathra" },
      ],
      stored({ P: ["s1", "s2", "s3", "d1", "d2"], T: ["t"] }),
      new Map([["s1", "blister|-|1pack-espathra"], ["s2", "blister|-|1pack-espathra"], ["s3", "blister|-|1pack-espathra"], ["d1", "blister|-|2pack-espathra"], ["d2", "blister|-|2pack-espathra"], ["t", "blister|-|1pack-espathra"]]),
      READ,
    ),
    [{ id: "P", from: "blister|-|espathra", to: "blister|-|2pack-espathra" }],
  );
  // Also when a listing vanished from a store that was read: it goes with the rest.
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "c", "d", "gone"] }), now, READ), [{ id: "P", from: "fpic", to: "fpic-series3" }]);
  // Not when a listing stays, or when a store that lists it wasn't read this run (it isn't dying).
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "c", "d", "e"] }), new Map([...now, ["e", "fpic"]]), READ), []);
  assert.deepEqual(planMoves(existing, stored({ P: ["a", "b", "c", "d", "unread"] }), now, READ), []);
});

test("moves: two products after the same free key — exactly one moves", () => {
  const existing = [
    { id: "A", groupKey: "k-a" },
    { id: "B", groupKey: "k-b" },
  ];
  const now = new Map([["a1", "K"], ["a2", "K"], ["b1", "K"]]);
  const moves = planMoves(existing, stored({ A: ["a1", "a2"], B: ["b1"] }), now, READ);
  assert.deepEqual(moves, [{ id: "A", from: "k-a", to: "K" }]);
});

test("moves: a swap blocks itself; a chain resolves whatever the order", () => {
  const swap = planMoves(
    [
      { id: "A", groupKey: "k1" },
      { id: "B", groupKey: "k2" },
    ],
    stored({ A: ["a"], B: ["b"] }),
    new Map([["a", "k2"], ["b", "k1"]]), READ);
  assert.deepEqual(swap, []);
  // A wants B's key; B wants a free one. A is visited first but moves second.
  const chain = planMoves(
    [
      { id: "A", groupKey: "k1" },
      { id: "B", groupKey: "k2" },
    ],
    stored({ A: ["a"], B: ["b"] }),
    new Map([["a", "k2"], ["b", "k3"]]), READ);
  assert.deepEqual(chain, [
    { id: "B", from: "k2", to: "k3" },
    { id: "A", from: "k1", to: "k2" },
  ]);
  // Written in that order, no two products ever hold one key; run again on
  // the moved state, nothing moves.
  const after = [
    { id: "A", groupKey: "k2" },
    { id: "B", groupKey: "k3" },
  ];
  assert.deepEqual(planMoves(after, stored({ A: ["a"], B: ["b"] }), new Map([["a", "k2"], ["b", "k3"]]), READ), []);
});

test("offer refs: the same hash the database computes (md5 of 'store url', 16 hex)", () => {
  // Postgres: SELECT left(md5('pokebox https://pokebox.example/products/x'), 16)
  assert.equal(offerRef("pokebox", "https://pokebox.example/products/x"), "7be11a29113a75c4");
  assert.match(offerRef("tcgplayer", "https://www.tcgplayer.com/product/1/x"), /^[0-9a-f]{16}$/);
  assert.notEqual(offerRef("a", "https://x"), offerRef("b", "https://x"));
});

test("renames: TCGplayer's name if it has one, else the name most listings give", () => {
  assert.equal(pickName([{ name: "30th Celebration 1x Mini Tin", marketplace: false }, { name: "30th Celebration Mini Tin", marketplace: true }]), "30th Celebration Mini Tin");
  assert.equal(
    pickName([
      { name: "Checklane Blister (Drifloon) | ME01", marketplace: false },
      { name: "Mega Evolution Checklane Blister Drifloon", marketplace: false },
      { name: "Mega Evolution Checklane Blister Drifloon", marketplace: false },
    ]),
    "Mega Evolution Checklane Blister Drifloon",
  );
  assert.equal(pickName([]), null);
});

test("a feed that fails after page 1 is marked cut off, not read as a small catalogue", async () => {
  const realFetch = globalThis.fetch;
  const page = (n: number) => ({ products: Array.from({ length: n }, (_, i) => ({ handle: `p${i}`, title: `Box ${i}`, variants: [{ price: "10.00", available: true }] })) });
  try {
    globalThis.fetch = (async (url: string) => {
      const u = new URL(url);
      if (u.pathname === "/robots.txt") return new Response("", { status: 404 });
      if (u.searchParams.get("page") === "1") return new Response(JSON.stringify(page(250)), { status: 200 });
      return new Response("upstream timeout", { status: 504 });
    }) as typeof fetch;
    const r = await readShopifyCollection("https://cut.example", "pokemon-sealed", { country: "AU" });
    assert.equal(r.ok, true);
    assert.equal(r.products.length, 250);
    assert.equal(r.truncatedAtPage, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("short reads: refused the first time, accepted for a store when the last run saw the same", () => {
  const rows = (n: number) => Array.from({ length: n }, () => ({}) as StoreRead["rows"][number]);
  const cut = { store, rows: rows(180), partial: "feed cut off at page 2 of pokemon" };
  assert.deepEqual(distrustRead(cut, 400, null), { reason: cut.partial, accept: false });
  assert.equal(distrustRead(cut, 400, "feed cut off at page 2 of pokemon; kept the previous rows")?.accept, true);
  assert.equal(distrustRead(cut, 400, "coverage dropped from 400 to 150 offers; kept the previous rows")?.accept, false);

  // A store's main collection failed and only a side collection read: 243 → 16.
  assert.equal(distrustRead({ store, rows: rows(16) }, 243, null)?.accept, false);
  assert.equal(distrustRead({ store, rows: rows(16) }, 243, "coverage dropped from 243 to 17 offers; kept the previous rows")?.accept, true);
  assert.equal(distrustRead({ store, rows: rows(130) }, 243, null), null); // a real sell-out, not a broken read
  assert.equal(distrustRead({ store, rows: rows(3) }, 15, null), null); // too small to judge
  assert.equal(distrustRead({ store, rows: rows(0) }, 0, null), null); // a new store

  // A marketplace's short read is never waved through: its rows are kept until pruned.
  const tcg = { store: TCGPLAYER, rows: rows(14) };
  assert.equal(distrustRead(tcg, 1578, null)?.accept, false);
  assert.equal(distrustRead(tcg, 1578, "coverage dropped from 1578 to 14 offers; kept the previous rows")?.accept, false);
});
