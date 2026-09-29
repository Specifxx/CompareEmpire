import { test } from "node:test";
import assert from "node:assert/strict";
import { REGION_LIST, REGIONS } from "../src/lib/regions";
import { regionOfSitemapId, regionSitemap, SITEMAP_IDS, sitemapIdOf, STATIC_SITEMAP_ID, staticSitemap } from "../src/lib/sitemap";
import { SITE_URL } from "../src/lib/site";
import { STORES } from "../src/lib/stores";

const onSite = (entries: { url: string }[]) => {
  for (const e of entries) {
    assert.ok(e.url === SITE_URL || e.url.startsWith(`${SITE_URL}/`), `not on SITE_URL: ${e.url}`);
    assert.ok(!e.url.includes("dexcompare.com"), e.url);
    assert.ok(!/\/\/[^/]+\/.*\/\//.test(e.url), `double slash: ${e.url}`);
  }
};

test("SITE_URL has no trailing slash and defaults to www.dexcompare.app", () => {
  assert.ok(!SITE_URL.endsWith("/"));
  if (!process.env.NEXT_PUBLIC_SITE_URL) assert.equal(SITE_URL, "https://www.dexcompare.app");
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
  for (const r of REGION_LIST) for (const p of ["", "/sealed", "/sets", "/stores", "/releases"]) assert.ok(urls.has(`${SITE_URL}/${r.region}${p}`), `${r.region}${p}`);
  for (const s of STORES) assert.ok(urls.has(`${SITE_URL}/${s.market.toLowerCase()}/stores/${s.key}`), s.key);
  assert.equal(entries.find((e) => e.url === `${SITE_URL}/au`)?.lastModified, when);
  assert.equal(entries.find((e) => e.url === `${SITE_URL}/us`)?.lastModified, undefined);
  assert.equal(urls.size, entries.length, "no duplicate URLs");
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
