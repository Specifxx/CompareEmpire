import { test } from "node:test";
import assert from "node:assert/strict";
import { dropLowOutliers, priceOf, rowsFromReads, type StoreRead } from "../src/lib/importer";
import { headlineOffer, offerStock, openStoreCount, rankOffers, OFFER_STALE_MS } from "../src/lib/sealed-offers";
import type { FeedProduct } from "../src/lib/feeds";
import type { StoreConfig } from "../src/lib/stores";

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
    rows: rowsFromReads({ ...store, key }, [{ handle: "pokemon", ok: true, products: [prod("p", "Pokemon Surging Sparks Booster Box", [[price, true]])] }]),
  });
  const reads = [mk("a", 26995), mk("b", 27995), mk("c", 28995), mk("d", 10995)];
  assert.equal(dropLowOutliers(reads), 1);
  assert.equal(reads[3].rows.length, 0);
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
