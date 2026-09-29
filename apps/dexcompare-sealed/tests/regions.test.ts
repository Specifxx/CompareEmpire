import { test } from "node:test";
import assert from "node:assert/strict";
import { isRegion, REGION_LIST, regionOrNotFound, X_DEFAULT_REGION, xDefaultRegion } from "../src/lib/regions";
import { pageMeta, regionAlternates } from "../src/lib/seo";
import { SITE_URL } from "../src/lib/site";

// next/navigation's notFound() throws an error Next recognises by its digest.
const notFoundDigest = (e: unknown) => (e as { digest?: string }).digest === "NEXT_NOT_FOUND";

test("regionOrNotFound: the seven lowercase codes resolve", () => {
  for (const r of REGION_LIST) assert.equal(regionOrNotFound(r.region).market, r.market);
});

test("regionOrNotFound: unknown, uppercase, empty and missing params throw NEXT_NOT_FOUND", () => {
  for (const v of ["foo", "AU", "Au", "terms", "", undefined, null, "au/", "usa"]) {
    assert.throws(() => regionOrNotFound(v), notFoundDigest, `expected notFound() for ${JSON.stringify(v)}`);
  }
});

test("isRegion is exact and lowercase", () => {
  assert.equal(isRegion("au"), true);
  assert.equal(isRegion("AU"), false);
  assert.equal(isRegion("__proto__"), false);
  assert.equal(isRegion("toString"), false);
});

test("xDefaultRegion prefers US, else the first advertised region, and never leaves the list", () => {
  assert.equal(X_DEFAULT_REGION, "us");
  assert.equal(xDefaultRegion(["au", "us", "uk"]), "us");
  assert.equal(xDefaultRegion(["au", "uk"]), "au");
  assert.equal(xDefaultRegion([]), "us");
});

test("regionAlternates: all regions by default, x-default → US; both call shapes agree", () => {
  const alt = regionAlternates("au", "/sets") as { canonical: string; languages: Record<string, string> };
  assert.equal(alt.canonical, `${SITE_URL}/au/sets`);
  assert.equal(alt.languages["x-default"], `${SITE_URL}/us/sets`);
  assert.equal(alt.languages["en-AU"], `${SITE_URL}/au/sets`);
  assert.equal(Object.keys(alt.languages).length, REGION_LIST.length + 1);
  assert.deepEqual(regionAlternates("/au/sets"), alt);
  assert.deepEqual(regionAlternates("/au/p/x", ["ca"]), regionAlternates("au", "/p/x", ["ca"]));
});

test("regionAlternates: a region home's x-default is the landing page (the region chooser)", () => {
  const alt = regionAlternates("/uk") as { canonical: string; languages: Record<string, string> };
  assert.equal(alt.canonical, `${SITE_URL}/uk`);
  assert.equal(alt.languages["x-default"], `${SITE_URL}/`);
  assert.equal(alt.languages["en-GB"], `${SITE_URL}/uk`);
});

test("regionAlternates: a path outside the regions gets a canonical and no hreflang", () => {
  assert.deepEqual(regionAlternates("/about"), { canonical: `${SITE_URL}/about` });
});

test("pageMeta: ogType product leaves openGraph.type out and sets og:type through other", () => {
  const m = pageMeta({ title: "t", description: "d", path: "/au/p/x", ogType: "product" });
  assert.ok(!("type" in (m.openGraph as object)));
  assert.equal((m.other as Record<string, string>)["og:type"], "product");
  const w = pageMeta({ title: "t", description: "d", path: "/au" });
  assert.equal((w.openGraph as { type: string }).type, "website");
});

test("regionAlternates: advertises only the regions given, always the page's own, x-default never a region not advertised", () => {
  const alt = regionAlternates("uk", "/p/x", ["ca", "eu"]) as { canonical: string; languages: Record<string, string> };
  assert.equal(alt.canonical, `${SITE_URL}/uk/p/x`);
  assert.deepEqual(Object.keys(alt.languages).sort(), ["en-CA", "en-GB", "en-IE", "x-default"]);
  assert.equal(alt.languages["x-default"], `${SITE_URL}/uk/p/x`);
  const withUs = regionAlternates("uk", "/p/x", [{ ...REGION_LIST[0] }, { ...REGION_LIST[1] }]) as { languages: Record<string, string> };
  assert.equal(withUs.languages["x-default"], `${SITE_URL}/us/p/x`);
  for (const u of Object.values(alt.languages)) assert.ok(u.startsWith(`${SITE_URL}/`), u);
});
