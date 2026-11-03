// The side rails (components/SideAds.tsx, owner 2026-11-03: eBay down the far left, TCGplayer down the far right, "only if you can fit
// it") and the quick view's eBay + TCGplayer mini pair. Pinned: browser-only and wide screens only (nothing in the server HTML, no
// layout shift), tiles sized to the window, the placements, and no Amazon in the pop-up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLACEMENTS } from "../src/lib/affiliate";
import { MAX_TILES, MIN_WIDTH, TILE_H, tilesThatFit } from "../src/components/SideAds";

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("side rails: wide screens only, the same width in the hook and the class, drawn in the browser after a matchMedia check", () => {
  assert.equal(MIN_WIDTH, 1864, "the 1480px shell plus two 160px rails with 16px gutters");
  const s = src("components/SideAds.tsx");
  assert.match(s, /^"use client";/, "a client component");
  assert.match(s, /min-\[1864px\]:flex/, "the CSS gate says the same width");
  assert.match(s, /window\.matchMedia\(`\(min-width: \$\{MIN_WIDTH\}px\)`\)/, "mounted only when the viewport fits");
  assert.match(s, /const \[fit, setFit\] = useState\(0\);[\s\S]*if \(fit < 1\) return null;/, "nothing is rendered before the check or when nothing fits (no SSR markup)");
  assert.match(s, /"fixed z-30 hidden flex-col/, "fixed beside the shell: takes no space, below the header (z-40) and the quick view (z-50)");
  for (const p of ["listings-side", "tcgplayer-strip-side"]) assert.ok((PLACEMENTS as readonly string[]).includes(p), `${p} is a placement`);
  assert.match(s, /useListings\(\{ region, context: "sealed", placement, min: 1, eager: true \}\)/, "the eBay rail shares the home strip's sealed request");
  assert.match(s, />Ad<\/span>/, "labelled Ad");
  assert.match(s, /rel=\{REL_SPONSORED\}/, "sponsored links");
  assert.doesNotMatch(s, /amazon/i, "no Amazon in a rail");
});

test("side rails: as many whole tiles as the window's height fits, never a clipped one, at most six", () => {
  assert.equal(tilesThatFit(0), 0);
  assert.equal(tilesThatFit(350), 0, "too short for one tile: no rail");
  assert.equal(tilesThatFit(400), 1);
  assert.equal(tilesThatFit(720), 2, "a 720px window fits two");
  assert.equal(tilesThatFit(1080), 4, "a 1080px window fits four");
  assert.equal(tilesThatFit(10_000), MAX_TILES);
  assert.ok(TILE_H > 180 && TILE_H < 240, `a tile is ${TILE_H}px tall`);
});

test("the region layout mounts the rails once, after the footer; the server HTML of a page never holds them", () => {
  const layout = src("app/[region]/layout.tsx");
  assert.match(layout, /<Footer region=\{r\.region\} \/>\s*\{\/\*[\s\S]*?\*\/\}\s*<SideAds region=\{r\.region\} tiles=\{tcg\} \/>/, "after the footer, the pre-footer strip's tiles");
  assert.equal(layout.match(/<SideAds /g)?.length, 1);
});

test("the quick view carries the product page's eBay + TCGplayer mini pair under its own placements, and still no Amazon", () => {
  const qv = src("components/QuickView.tsx");
  assert.match(qv, /<MiniSealedAds[\s\S]*ebayPlacement="listings-quickview-mini"[\s\S]*tcgPlacement="tcgplayer-strip-quickview"/);
  for (const p of ["listings-quickview-mini", "tcgplayer-strip-quickview"]) assert.ok((PLACEMENTS as readonly string[]).includes(p), `${p} is a placement`);
  const api = src("app/api/quick/[region]/[slug]/route.ts");
  assert.match(api, /tcgplayerAffiliateUrl\(t\.url, region, "tcgplayer-strip-quickview"\)/, "tiles tagged on the server");
  assert.match(api, /context: `item:\$\{p\.slug\}`/, "the product's own listings");
  assert.match(api, /amazon: null/, "no Amazon link in a pop-up (Associates Operating Agreement)");
});
