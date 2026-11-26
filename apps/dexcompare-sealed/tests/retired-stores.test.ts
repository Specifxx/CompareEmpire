import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RETIRED_STORES, retiredStoreRedirect } from "../src/lib/retired-stores";
import { STORE_BY_KEY } from "../src/lib/stores";

// Stores retired 2026-11-20 (lib/retired-stores.ts): no longer read, and their old store pages 301 to the region's
// store directory instead of a 404 (URL freeze).

test("a retired store is out of the registry", () => {
  for (const key of Object.keys(RETIRED_STORES)) assert.equal(STORE_BY_KEY.get(key), undefined, key);
});

test("a retired store's old page redirects to its own region's store directory", () => {
  assert.equal(retiredStoreRedirect("kumacards"), "/uk/stores");
  assert.equal(retiredStoreRedirect("southtexastcg"), "/us/stores");
  assert.equal(retiredStoreRedirect("collectivecubed"), "/us/stores");
  assert.equal(retiredStoreRedirect("obsessiongaming"), "/au/stores");
  assert.equal(retiredStoreRedirect("industria61"), "/eu/stores");
  assert.equal(retiredStoreRedirect("thesidedeck"), null);
  assert.equal(retiredStoreRedirect("constructor"), null);
});

test("the store page redirects a retired key before its 404", () => {
  const src = readFileSync(new URL("../src/app/[region]/stores/[store]/StoreListing.tsx", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export function storeInRegion"));
  assert.ok(fn.indexOf("permanentRedirect(retired)") > 0);
  assert.ok(fn.indexOf("permanentRedirect(retired)") < fn.indexOf("notFound()"));
});
