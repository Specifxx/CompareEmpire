import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rowsFromReads } from "../src/lib/importer";
import { readShopifyCollection, WHOLE_CATALOGUE } from "../src/lib/feeds";
import { STORE_BY_KEY } from "../src/lib/stores";

// L'Atelier TCG (Laval, QC) runs its own platform, not Shopify, but serves Shopify's feed format for its whole catalogue at
// /products.json (every game, CAD, a `url` field linking its own product page). The fixture is a sample of that live feed
// as read on 2026-10-26 (titles, prices and availability as served; handles and ids filled in), trimmed to the fields the
// importer reads: its other games, its Pokémon sealed, one sold-out.
test("L'Atelier TCG: the whole-catalogue feed lists its Pokémon sealed only, linking its own product pages", async () => {
  const store = STORE_BY_KEY.get("ateliertcg")!;
  assert.deepEqual(store, {
    key: "ateliertcg",
    name: "L'Atelier TCG",
    base: "https://ateliertcg.com",
    market: "CA",
    platform: "shopify",
    country: "CA",
    collections: [WHOLE_CATALOGUE],
  });
  const feed = readFileSync(new URL("./fixtures/ateliertcg-products-2026-10-26.json", import.meta.url), "utf8");
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const u = new URL(url);
    if (u.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /api/\nDisallow: /*/cart\n", { status: 200 });
    asked.push(`${u.pathname}?${u.searchParams}`);
    return new Response(feed, { status: 200 });
  }) as typeof fetch;
  const read = await readShopifyCollection(store.base, store.collections[0], { country: store.country }).finally(() => {
    globalThis.fetch = realFetch;
  });
  assert.deepEqual(asked, ["/products.json?limit=250&page=1&country=CA"]);
  assert.equal(read.ok, true);

  const rows = rowsFromReads(store, [read]);
  // Other games never reach a row (the catalogue is read strictly), and "Elite Trainer" without "Box" is refused, not guessed.
  assert.deepEqual(Object.fromEntries(rows.map((r) => [r.title, r.identity.groupKey])), {
    "Pokémon SV8.5 Prismatic Evolutions Super Premium Collection": "collection|sv8pt5|super",
    "Pokémon SV8.5 Prismatic Evolutions Surprise Box": "collection|sv8pt5|surprise",
    "Pokémon SV9 Journey Together 3PK Blister": "blister|sv9|",
    "Pokémon SV9 Journey Together Booster Box": "sv9|booster-box",
    "Pokémon SV9 Journey Together Booster Bundle": "sv9|booster-bundle",
    "Pokémon SWSH5 Battle Styles Booster Box": "swsh5|booster-box",
    "Pokémon SWSH9 Brilliant Stars Booster Box": "swsh9|booster-box",
    "Pokémon Trainer's Toolkit 2023": "collection|-|2023-toolkit-trainer",
    "Pokémon Celebrations Ultra-Premium Collection": "upc|celebrations",
    "Pokémon Unova Mini Tin": "tin|-|mini-unova",
    "Sleeved Pokemon ME02 Phantasmal Flames Pack": "me2|sleeved-booster",
  });
  assert.equal(rows.find((r) => r.title === "Pokémon Unova Mini Tin")!.inStock, false);
  const box = rows.find((r) => r.title === "Pokémon SV9 Journey Together Booster Box")!;
  assert.equal(box.url, "https://ateliertcg.com/en/product/pokemon-sv9-journey-together-booster-box/");
  assert.equal(box.priceCents, 42029);
});

test("a feed `url` off the store's origin is ignored for Shopify's /products/<handle>", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (new URL(url).pathname === "/robots.txt") return new Response("", { status: 404 });
    return new Response(
      JSON.stringify({ products: [{ handle: "box", title: "Pokémon Box", url: "https://elsewhere.example/box", variants: [{ price: "10.00", available: true }] }] }),
      { status: 200 },
    );
  }) as typeof fetch;
  const read = await readShopifyCollection("https://shop.example", "pokemon").finally(() => {
    globalThis.fetch = realFetch;
  });
  assert.equal(read.products[0].url, "https://shop.example/products/box");
});
