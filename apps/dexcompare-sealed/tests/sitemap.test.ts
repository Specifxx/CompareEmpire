import { test } from "node:test";
import assert from "node:assert/strict";
import { REGION_LIST, REGIONS } from "../src/lib/regions";
import { regionOfSitemapId, regionSitemap, SITEMAP_IDS, SITEMAP_STORE_PAGES, sitemapIdOf, STATIC_SITEMAP_ID, staticSitemap } from "../src/lib/sitemap";
import { SITEMAP_PRODUCTS, sitemapProductSlugs } from "../src/lib/index-tiers";
import { SITE_URL } from "../src/lib/site";
import { STORES } from "../src/lib/stores";
import { GUIDES, guideRegions } from "../src/content/guides";
import { COUNTRY_GUIDE } from "../src/content/guides/country-prices";

const onSite = (entries: { url: string }[]) => {
  for (const e of entries) {
    assert.ok(e.url === SITE_URL || e.url.startsWith(`${SITE_URL}/`), `not on SITE_URL: ${e.url}`);
    assert.ok(!e.url.includes("dexcompare.com"), e.url);
    assert.ok(!/\/\/[^/]+\/.*\/\//.test(e.url), `double slash: ${e.url}`);
  }
};

test("SITE_URL has no trailing slash and defaults to the apex, dexcompare.app", () => {
  assert.ok(!SITE_URL.endsWith("/"));
  if (!process.env.NEXT_PUBLIC_SITE_URL) assert.equal(SITE_URL, "https://dexcompare.app");
});

test("sitemap ids: 0 = static, 1..7 = REGION_LIST order", () => {
  assert.deepEqual(
    SITEMAP_IDS.map((s) => s.id),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(STATIC_SITEMAP_ID, 0);
  assert.equal(sitemapIdOf("au"), 1);
  assert.equal(sitemapIdOf("us"), 2);
  assert.equal(regionOfSitemapId(3)?.region, "uk");
  assert.equal(regionOfSitemapId(0), null);
  assert.equal(regionOfSitemapId(8), null);
  for (const r of REGION_LIST) assert.equal(regionOfSitemapId(sitemapIdOf(r.region))?.region, r.region);
});

test("static sitemap: root, trust pages, every region's landing pages, every store; all on SITE_URL", () => {
  const when = new Date("2026-09-25T07:54:42Z");
  const entries = staticSitemap({ AU: when });
  onSite(entries);
  const urls = new Set(entries.map((e) => e.url));
  for (const p of ["", "/about", "/terms", "/privacy", "/contact"]) assert.ok(urls.has(`${SITE_URL}${p}`), p);
  for (const r of REGION_LIST) for (const p of ["", "/sealed", "/sets", "/stores", "/releases", "/deals", "/cheapest-packs", "/this-week", "/guides"]) assert.ok(urls.has(`${SITE_URL}/${r.region}${p}`), `${r.region}${p}`);
  const at = (p: string) => entries.find((e) => e.url === `${SITE_URL}${p}`)!;
  assert.deepEqual([at("/au/deals").changeFrequency, at("/au/deals").priority, at("/au/deals").lastModified], ["daily", 0.7, when]);
  assert.deepEqual([at("/au/cheapest-packs").changeFrequency, at("/au/cheapest-packs").priority], ["daily", 0.6]);
  assert.deepEqual([at("/au/this-week").changeFrequency, at("/au/this-week").priority], ["daily", 0.5]);
  assert.deepEqual([at("/au/guides").changeFrequency, at("/au/guides").priority, at("/au/guides").lastModified], ["weekly", 0.5, undefined], "an editorial index: no import-time lastmod");
  for (const s of STORES) assert.ok(!urls.has(`${SITE_URL}/${s.market.toLowerCase()}/stores/${s.key}`), `${s.key}: store pages are not listed (2026-11-07)`);
  assert.equal(entries.find((e) => e.url === `${SITE_URL}/au`)?.lastModified, when);
  assert.equal(entries.find((e) => e.url === `${SITE_URL}/us`)?.lastModified, undefined);
  assert.equal(urls.size, entries.length, "no duplicate URLs");
});

test("store pages are out of the sitemap (2026-11-07), the directories stay", () => {
  assert.equal(SITEMAP_STORE_PAGES, false);
  for (const entries of [staticSitemap({}), staticSitemap({}, [STORES[0].key]), staticSitemap({}, [])]) {
    onSite(entries);
    assert.equal(entries.filter((e) => /\/stores\/[^/]+$/.test(e.url)).length, 0);
    for (const r of REGION_LIST) assert.ok(entries.some((e) => e.url === `${SITE_URL}/${r.region}/stores`), "the directory pages stay");
  }
});

test("the sitemap names each region's most-stocked strong products, capped", () => {
  const st = (inStockStores: number, listedStores = inStockStores) => ({ inStockStores, listedStores, marketplaceOpen: false });
  const rows = [
    { slug: "thin", productType: "Booster Box", s: st(0, 1) },
    { slug: "b", productType: "Booster Box", s: st(4, 9) },
    { slug: "a", productType: "Booster Box", s: st(9, 9) },
    { slug: "c", productType: "Booster Box", s: st(4, 12) },
  ];
  assert.deepEqual(sitemapProductSlugs("US", rows), ["a", "c", "b"], "strong only, most in stock first, then most listed");
  const many = Array.from({ length: 500 }, (_, i) => ({ slug: `p${i}`, productType: "Booster Box", s: st(3 + (i % 7)) }));
  for (const [m, cap] of Object.entries(SITEMAP_PRODUCTS)) assert.equal(sitemapProductSlugs(m, many).length, cap, m);
  assert.ok(SITEMAP_PRODUCTS.US >= SITEMAP_PRODUCTS.NZ);
});

test("region sitemap: known types and sets only, every comparable product, all on SITE_URL", () => {
  const entries = regionSitemap(REGIONS.uk, {
    typeLabels: ["Booster Box", "Elite Trainer Box", "Not A Type"],
    setCodes: ["me4", "no-such-set"],
    productSlugs: ["a-box", "b-etb"],
    lastmod: null,
  });
  onSite(entries);
  const urls = entries.map((e) => e.url);
  assert.deepEqual(urls, [
    `${SITE_URL}/uk/type/booster-boxes`,
    `${SITE_URL}/uk/type/elite-trainer-boxes`,
    `${SITE_URL}/uk/sets/chaos-rising`,
    `${SITE_URL}/uk/p/a-box`,
    `${SITE_URL}/uk/p/b-etb`,
  ]);
  assert.ok(entries.every((e) => e.lastModified === undefined));
});

test("region sitemap: nothing comparable → empty, never a guess", () => {
  assert.deepEqual(regionSitemap(REGIONS.sg, { typeLabels: [], setCodes: [], productSlugs: [], lastmod: null }), []);
});

test("static sitemap: every guide in each region it is offered in, and nowhere else (the MSRP guide is US-only)", () => {
  const entries = staticSitemap({});
  onSite(entries);
  const urls = new Set(entries.map((e) => e.url));
  for (const g of GUIDES) {
    for (const r of REGION_LIST) {
      const u = `${SITE_URL}/${r.region}/guides/${g.slug}`;
      assert.equal(urls.has(u), guideRegions(g).includes(r.region), u);
    }
  }
  assert.ok(urls.has(`${SITE_URL}/us/guides/pokemon-tcg-msrp`));
  // The new guides: Build & Battle in every region, and the one by-country page at its region-less URL.
  for (const r of REGION_LIST) assert.ok(urls.has(`${SITE_URL}/${r.region}/guides/pokemon-build-and-battle-box`), r.region);
  assert.equal(entries.filter((e) => e.url === `${SITE_URL}/guides/pokemon-booster-box-prices-by-country`).length, 1);
  assert.equal(`${SITE_URL}${COUNTRY_GUIDE.path}`, `${SITE_URL}/guides/pokemon-booster-box-prices-by-country`);
  assert.ok(!urls.has(`${SITE_URL}/au/guides/pokemon-tcg-msrp`));
  const at = entries.find((e) => e.url === `${SITE_URL}/uk/guides/how-many-packs-in-pokemon-products`)!;
  assert.deepEqual([at.changeFrequency, at.priority, at.lastModified], ["weekly", 0.6, undefined], "editorial: no import-time lastmod");
  assert.equal(urls.size, entries.length, "no duplicate URLs");
});
