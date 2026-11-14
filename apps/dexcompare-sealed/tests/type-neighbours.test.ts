// "Other <type> in <region>" on a product page (src/lib/type-neighbours.ts, 2026-11-14): each product links the open, indexable
// products of its type on either side of it in one fixed order, so links are spread evenly instead of piling onto the newest sets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ProductCardData } from "../src/lib/data";
import { toCard } from "../src/lib/data";
import { productNoindex } from "../src/lib/index-tiers";
import { cardRow, statsInMarket } from "../src/lib/public-data/joins";
import { NEIGHBOURS, typeNeighbours } from "../src/lib/type-neighbours";

const card = (slug: string, releaseDate: string | null, inStockStores = 3, listedStores = 4): ProductCardData => ({
  slug,
  name: slug,
  productType: "Booster Box",
  setCode: null,
  imageUrl: null,
  lowestPriceCents: inStockStores > 0 ? 10000 : null,
  inStockStores,
  listedStores,
  marketplaceOpen: false,
  medianOpenCents: null,
  releaseDate,
});

test("a product links the sets released just before and after it, never itself; at either end the window slides inward", () => {
  const rows = Array.from({ length: 12 }, (_, i) => card(`box-${String(i).padStart(2, "0")}`, `2026-${String(i + 1).padStart(2, "0")}-01`));
  assert.deepEqual(typeNeighbours(rows[5], rows).map((p) => p.slug), ["box-02", "box-03", "box-04", "box-06", "box-07", "box-08"]);
  assert.deepEqual(typeNeighbours(rows[0], rows).map((p) => p.slug), ["box-01", "box-02", "box-03", "box-04", "box-05", "box-06"], "the oldest links the six after it");
  assert.deepEqual(typeNeighbours(rows[11], rows).map((p) => p.slug), ["box-05", "box-06", "box-07", "box-08", "box-09", "box-10"], "the newest links the six before it, never the oldest");
});

test("a small type links all of its others; sold-out and thin products are never linked, but still link out", () => {
  const rows = [card("a", "2026-01-01"), card("b", "2026-02-01"), card("sold", "2026-03-01", 0, 6), card("thin", "2026-04-01", 1, 2), card("c", null)];
  assert.deepEqual(typeNeighbours(rows[0], rows).map((p) => p.slug), ["c", "b"], "undated first, then by date");
  assert.deepEqual(typeNeighbours(rows[2], rows).map((p) => p.slug), ["c", "a", "b"], "a sold-out page links the open ones");
  assert.deepEqual(typeNeighbours(card("gone", "2026-02-15"), rows).map((p) => p.slug), ["c", "a", "b"], "a product outside the rows still gets neighbours");
});

test("on the committed data: every open, indexable product of a big type is linked from NEIGHBOURS / 2 or more product pages, most from NEIGHBOURS", () => {
  assert.ok(readFileSync("data/public/product-stats.json", "utf8").length > 0);
  for (const market of ["US", "AU", "UK", "CA"] as const) {
    const all = statsInMarket(market).map((x) =>
      toCard({ ...cardRow(x), product: { slug: String(x.p.slug), name: String(x.p.name), productType: String(x.p.productType), setCode: (x.p.setCode as string | null) ?? null, imageUrl: null } }),
    );
    const byType = new Map<string, ProductCardData[]>();
    for (const p of all) byType.set(p.productType, [...(byType.get(p.productType) ?? []), p]);
    let checked = 0;
    for (const [type, rows] of byType) {
      const linkable = rows.filter((p) => (p.inStockStores > 0 || p.marketplaceOpen) && p.lowestPriceCents != null && !productNoindex(p, p.productType));
      const inlinks = new Map<string, number>();
      for (const p of rows) {
        const out = typeNeighbours(p, rows);
        assert.ok(out.length <= NEIGHBOURS);
        assert.ok(!out.some((n) => n.slug === p.slug), `${market} ${p.slug} links itself`);
        assert.equal(new Set(out.map((n) => n.slug)).size, out.length, `${market} ${p.slug}: no product twice`);
        for (const n of out) {
          assert.ok(linkable.includes(n), `${market} ${type}: ${n.slug} is sold out or noindex and must not be linked`);
          if (linkable.includes(p)) inlinks.set(n.slug, (inlinks.get(n.slug) ?? 0) + 1);
        }
      }
      if (linkable.length <= NEIGHBOURS) continue;
      for (const p of linkable) assert.ok((inlinks.get(p.slug) ?? 0) >= NEIGHBOURS / 2, `${market} ${type}: ${p.slug} is linked from ${inlinks.get(p.slug) ?? 0} linkable product pages`);
      if (linkable.length >= 3 * NEIGHBOURS) assert.ok(linkable.filter((p) => inlinks.get(p.slug) === NEIGHBOURS).length >= linkable.length - 2 * NEIGHBOURS, `${market} ${type}: away from the two ends, exactly ${NEIGHBOURS}`);
      checked += linkable.length;
    }
    assert.ok(checked > 20, `${market}: only ${checked} products checked`);
  }
});

test("the product page draws the list as plain links with the import's price and store count, under the same-set grid", () => {
  const page = readFileSync("src/app/[region]/p/[slug]/page.tsx", "utf8");
  assert.match(page, /sameTypeNeighbours\(r\.market/);
  assert.match(page, /<ul data-neighbours=""/);
  assert.match(page, /title=\{`Other \$\{type\.plural\} in \$\{r\.inName\}`\}/);
  const list = page.slice(page.indexOf("const neighbourList"), page.indexOf("// \"Quick facts\""));
  assert.match(list, /prefetch=\{false\}/);
  assert.doesNotMatch(list, /<img|ProductCard|data-qv/, "links only: no photo, no quick view, no script");
  assert.ok(page.indexOf("{neighbourList}") > page.indexOf("More from ${set.name}"), "after the same-set grid");
});
