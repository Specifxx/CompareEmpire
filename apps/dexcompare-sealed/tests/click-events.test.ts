// Click analytics and the /go redirect (lib/click-events.ts, lib/go.ts, src/app/go/route.ts): the event shapes Vercel's plans can keep,
// no visitor data in any event, and a redirect that only ever goes to the store the link names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buyEvents, goHref, pageTypeOf, regionOfPath, regionSwitchEvent, searchEvent } from "../src/lib/click-events";
import { goAllowed, goEvent, parseGo } from "../src/lib/go";
import { STORES } from "../src/lib/stores";

const store = STORES.find((s) => s.market === "AU")!;
const storeUrl = `${store.base}/products/surging-sparks-booster-box`;

test("page types and regions from a path", () => {
  assert.equal(pageTypeOf("/"), "landing");
  assert.equal(pageTypeOf("/au"), "home");
  assert.equal(pageTypeOf("/au/p/surging-sparks-booster-box"), "product");
  assert.equal(pageTypeOf("/us/preorders/delta-reign"), "preorders");
  assert.equal(pageTypeOf("/uk/deals"), "deals");
  assert.equal(pageTypeOf("/uk/black-friday"), "black-friday");
  assert.equal(pageTypeOf("/au/sealed?q=etb"), "browse");
  assert.equal(pageTypeOf("/guides/pokemon-booster-box-prices-by-country"), "guide");
  assert.equal(regionOfPath("/nz/sets/x"), "nz");
  assert.equal(regionOfPath("/about"), null);
});

test("Pro (two properties): buy_click {retailer, placement} as before, plus buy_product {product, region}; nothing else", () => {
  const ev = buyEvents({ retailer: "Pokebox (AU)", placement: "product-table", rel: "nofollow noopener", pathname: "/au/p/x-etb", item: { product: "x-etb", store: "pokebox", priceCents: 6999, position: 3 } }, 2);
  assert.deepEqual(ev, [
    ["buy_click", { retailer: "Pokebox (AU)", placement: "product-table" }],
    ["buy_product", { product: "x-etb", region: "au" }],
  ]);
  for (const [, props] of ev) assert.ok(Object.keys(props).length <= 2, "Pro keeps two properties");
  // an eBay search has no product: one event
  assert.equal(buyEvents({ retailer: "eBay (ebay.com.au)", placement: "header", rel: "sponsored nofollow", pathname: "/au" }, 2).length, 1);
});

test("Web Analytics Plus (eight properties): one buy_click with product, store, region, price, position, page, affiliate, placement", () => {
  const [[name, props]] = buyEvents(
    { retailer: "TCGplayer", placement: "product-best", rel: "sponsored nofollow noopener noreferrer", pathname: "/us/p/x-box", item: { product: "x-box", store: "tcgplayer", priceCents: 14999, position: 1 } },
    8,
  );
  assert.equal(name, "buy_click");
  assert.deepEqual(props, { product: "x-box", store: "tcgplayer", region: "us", price: 149.99, position: 1, page: "product", affiliate: true, placement: "product-best" });
  assert.ok(Object.keys(props).length <= 8);
  const [[, store]] = buyEvents({ retailer: "Pokebox (AU)", placement: "product-table", rel: "nofollow noopener", pathname: "/au/p/x", item: { store: "pokebox" } }, 8);
  assert.equal(store.affiliate, false, "a store link is not an affiliate link");
});

test("every value is a string, number, boolean or null, at most 255 characters: Vercel's rules", () => {
  const long = "x".repeat(400);
  for (const props of [2, 8])
    for (const [name, p] of buyEvents({ retailer: long, placement: long, rel: "", pathname: "/au/p/x", item: { product: long } }, props)) {
      assert.ok(name.length <= 255);
      for (const v of Object.values(p)) {
        assert.ok(v === null || ["string", "number", "boolean"].includes(typeof v));
        if (typeof v === "string") assert.ok(v.length <= 255);
      }
    }
  assert.deepEqual(regionSwitchEvent("au", "us"), ["region_switch", { from: "au", to: "us" }]);
  assert.deepEqual(searchEvent("uk", "submit"), ["search", { region: "uk", kind: "submit" }], "the query is never sent");
});

test("/go goes only to the host of the store it names (or TCGplayer's two), so it is never an open redirect", () => {
  assert.equal(goAllowed(store.key, storeUrl), true);
  assert.equal(goAllowed(store.key, "https://evil.example/phish"), false);
  assert.equal(goAllowed(store.key, `https://${new URL(store.base).hostname}.evil.example/`), false, "a look-alike suffix");
  assert.equal(goAllowed(store.key, "javascript:alert(1)"), false);
  assert.equal(goAllowed("tcgplayer", "https://partner.tcgplayer.com/c/7385758/1780961/21018?u=x"), true);
  assert.equal(goAllowed("tcgplayer", "https://www.tcgplayer.com/product/1"), true);
  assert.equal(goAllowed("tcgplayer", storeUrl), false);
  assert.equal(goAllowed("no-such-store", storeUrl), false);
});

test("goHref and parseGo round-trip; anything missing, unknown or foreign is refused", () => {
  const href = goHref({ dest: storeUrl, store: store.key, region: "au", placement: "product-table", product: "surging-sparks-booster-box", priceCents: 22999, position: 2 });
  assert.match(href, /^\/go\?/);
  const p = parseGo(new URLSearchParams(href.slice(4)))!;
  assert.deepEqual(p, { dest: storeUrl, store: store.key, region: "au", placement: "product-table", product: "surging-sparks-booster-box", priceCents: 22999, position: 2 });
  const q = (o: Record<string, string>) => parseGo(new URLSearchParams(o));
  assert.equal(q({ u: storeUrl, s: store.key, r: "au", pl: "made-up" }), null, "unknown placement");
  assert.equal(q({ u: storeUrl, s: store.key, r: "xx", pl: "product-table" }), null, "unknown region");
  assert.equal(q({ u: "https://evil.example/", s: store.key, r: "au", pl: "product-table" }), null);
  assert.equal(q({ s: store.key, r: "au", pl: "product-table" }), null);
  assert.equal(q({ u: storeUrl, s: store.key, r: "au", pl: "product-table", p: "<script>" })!.product, undefined, "a malformed slug is dropped");
  assert.deepEqual(goEvent(p, 2), ["go_click", { store: store.key, placement: "product-table" }]);
  assert.equal(Object.keys(goEvent(p, 8)[1]).length, 8);
});

test("the /go route: edge, 302, uncached and noindex, the event after the response; robots.txt disallows it", () => {
  const route = readFileSync("src/app/go/route.ts", "utf8");
  assert.match(route, /runtime = "edge"/);
  assert.match(route, /status: 302/);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.match(route, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.match(route, /waitUntil\(track\(/);
  assert.match(readFileSync("src/app/robots.ts", "utf8"), /disallow: \["\/api\/", "\/go", "\/\*\?"\]/);
});
