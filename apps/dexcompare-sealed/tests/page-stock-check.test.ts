import { test } from "node:test";
import assert from "node:assert/strict";
import { pageStockVerdict } from "../src/lib/page-stock-check";
import { verifyCheapestPages, type ImportRow, type StoreRead } from "../src/lib/importer";

// Real wordings from the Delta Reign Elite Trainer Box pages, 2026-11-09.
const DYNAMIC = `<main><div><span class="dcc-instore__title">In Store Only</span><span class="dcc-instore__sub">This item is available to buy in person at our store.</span></div><button>Add to cart</button></main>`;
const CARDPOP = `<div class="announcement">*ONLINE ORDERING TEMPORARILY UNAVAILABLE</div><main><h1>Pokemon - Delta Reign - Elite Trainer Box</h1></main>`;
const WULF_HELD = `<script>t.textContent='Not sold online. Come in to buy this one.'; function instore(v){}</script><form class="wsc-form wsc-rise is-instore"><button>Available in store only</button></form>`;
const WULF_NORMAL = `<script>t.textContent='Not sold online. Come in to buy this one.'; var label='Available in store only'; .wsc-atc.is-instore{}</script><style>.wsc-form.is-instore{}</style><form class="wsc-form wsc-rise"><button>Add to cart</button></form>`;
const FINE = [
  `<main><p>Pickup available at Noblesville</p><p>Usually ready same day</p><button>Add to cart</button></main>`,
  `<main>Reserve for in-store pickup · Madison, TN <button>Add to bag →</button></main>`,
  `<main>Presale item. Release date 11/6/2026.<button>Add to cart</button></main>`,
  `<footer>We also sell in our store. Online orders ship in 2 days.</footer>`,
];

test("pages that cannot be bought online are refused", () => {
  assert.equal(pageStockVerdict(DYNAMIC).ok, false);
  const c = pageStockVerdict(CARDPOP);
  assert.equal(c.ok, false);
  assert.equal(c.ok === false && c.shopWide, true);
  assert.equal(pageStockVerdict(WULF_HELD).ok, false);
});

test("pages that can be bought are believed, and theme script text does not count", () => {
  assert.equal(pageStockVerdict(WULF_NORMAL).ok, true);
  for (const h of FINE) assert.equal(pageStockVerdict(h).ok, true, h);
});

function read(key: string, rows: [string, number][]): StoreRead {
  const mk = ([url, priceCents]: [string, number]): ImportRow =>
    ({ identity: { groupKey: "me6|etb" } as never, title: "Delta Reign Elite Trainer Box", url, priceCents, inStock: true, imageUrl: null });
  return { store: { key, name: key, base: `https://${key}.example`, market: "US", platform: "shopify" } as never, ok: true, error: null, rows: rows.map(mk), products: rows.length, rediscovered: false, ms: 0 };
}

test("a failing row is written as sold out, the next cheapest is opened, a closed shop loses every row", async () => {
  const reads = [
    read("instore", [["https://instore.example/products/a", 7500]]),
    read("closed", [["https://closed.example/products/a", 7999], ["https://closed.example/products/b", 9999]]),
    read("fine", [["https://fine.example/products/a", 8000]]),
    read("down", [["https://down.example/products/a", 8100]]),
  ];
  const pages: Record<string, string | null> = {
    "https://instore.example/products/a": DYNAMIC,
    "https://closed.example/products/a": CARDPOP,
    "https://fine.example/products/a": FINE[0],
    "https://down.example/products/a": null, // unreadable: believed
  };
  const out = await verifyCheapestPages(reads, async (u) => pages[u] ?? null, 60_000);
  assert.deepEqual(reads.map((r) => r.rows.map((x) => x.inStock)), [[false], [false, false], [true], [true]]);
  assert.deepEqual(out.closedShops, ["closed"]);
  assert.equal(out.demoted.length, 2);
});
