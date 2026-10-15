import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guideShowsMsrp, openPreorderGuides, preorderGuide, preorderGuideBySlug, preorderPath, PREORDER_GUIDES } from "../src/lib/preorder-guides";
import { isPreorderSet } from "../src/lib/release";
import { REGION_LIST } from "../src/lib/regions";
import { TYPE_BY_KEY } from "../src/lib/sealed-title";
import { SET_BY_CODE } from "../src/lib/sets";
import { SITE_URL } from "../src/lib/site";
import { staticSitemap } from "../src/lib/sitemap";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every pre-order guide is for a known set, with known product types, sourced and dated", () => {
  assert.ok(PREORDER_GUIDES.length > 0);
  for (const g of PREORDER_GUIDES) {
    const set = SET_BY_CODE.get(g.setCode);
    assert.ok(set, `${g.setCode} is in lib/sets.ts`);
    for (const p of g.products) assert.ok(TYPE_BY_KEY.has(p.type), `${g.setCode}: ${p.type} is a product type`);
    assert.equal(new Set(g.products.map((p) => p.type)).size, g.products.length, "one entry per type");
    assert.ok(g.sources.length > 0 && g.sources.every((s) => s.url.startsWith("https://")), "sourced");
    assert.match(g.checked, /^\d{4}-\d{2}-\d{2}$/);
    for (const d of [g.prereleaseFrom, g.liveDate]) if (d) assert.ok(d < set!.releaseDate, "dates before release day");
  }
});

test("Delta Reign: the dates The Pokémon Company announced", () => {
  const g = preorderGuide("me6");
  assert.ok(g);
  assert.equal(SET_BY_CODE.get("me6")?.releaseDate, "2026-11-06");
  assert.equal(g.prereleaseFrom, "2026-10-24");
  assert.equal(g.liveDate, "2026-11-05");
  assert.deepEqual(preorderGuideBySlug("delta-reign")?.set.code, "me6");
  assert.equal(preorderGuideBySlug("chaos-rising"), null, "no guide, no page");
  assert.equal(preorderGuideBySlug("no-such-set"), null);
  assert.equal(preorderPath("au", "me6"), "/au/preorders/delta-reign");
  assert.equal(preorderPath("au", "me4"), null);
  // The Build & Battle Box's list price is disputed (announcement vs lib/rrp.ts): not printed.
  assert.equal(guideShowsMsrp(g, "build-battle"), false);
  assert.equal(guideShowsMsrp(g, "booster-box"), true);
});

test("pre-order pages retire themselves on release day", () => {
  assert.deepEqual(
    openPreorderGuides("2026-10-14").map((x) => x.set.code),
    ["me6"],
  );
  assert.deepEqual(openPreorderGuides("2026-11-06"), [], "release day: no longer a pre-order");
  assert.equal(isPreorderSet("me6", new Date("2026-11-05T23:59:00Z")), true);
  assert.equal(isPreorderSet("me6", new Date("2026-11-06T00:00:00Z")), false);

  const before = new Set(staticSitemap({}, undefined, "2026-10-14").map((e) => e.url));
  for (const r of REGION_LIST) assert.ok(before.has(`${SITE_URL}/${r.region}/preorders/delta-reign`), r.region);
  const after = staticSitemap({}, undefined, "2026-11-06").map((e) => e.url);
  assert.ok(!after.some((u) => u.includes("/preorders/")), "out of the sitemap once released");
});

test("the pre-order page says PreOrder, never InStock, and uses its own placement", () => {
  const page = src("src/app/[region]/preorders/[set]/page.tsx");
  assert.match(page, /schema\.org\/PreOrder/);
  assert.doesNotMatch(page, /schema\.org\/InStock/);
  assert.match(page, /placement="preorders"/);
  assert.match(page, /regionOrNotFound\(params\.region\)/);
  assert.match(page, /export const revalidate = 86400/);
  assert.match(page, /noindex: !pre/);
});

test("set page, release calendar and region home link the pre-order page", () => {
  assert.match(src("src/app/[region]/sets/[set]/page.tsx"), /preorderPath\(r\.region, s\.code\)/);
  assert.match(src("src/app/[region]/releases/page.tsx"), /preorderPath\(r\.region, s\.code\)/);
  assert.match(src("src/app/[region]/page.tsx"), /openPreorderGuides\(\)/);
});
