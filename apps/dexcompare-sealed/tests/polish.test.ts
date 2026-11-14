// The polish pass of 2026-11-14 (DECISIONS.md): the faults it fixed stay fixed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceHistoryChart } from "../src/components/PriceHistoryChart";
import { MIN_DAYS } from "../src/lib/price-history";

// The components are compiled with the classic JSX runtime under tsx (as tests/price-history.test.ts).
(globalThis as unknown as { React: typeof React }).React = React;

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("the focus ring keeps the element's own corners: no radius in a rule that out-ranks the utilities", () => {
  const rule = /(^|\n):focus-visible \{([^}]*)\}/.exec(css);
  assert.ok(rule, "the focus ring's rule is there");
  assert.match(rule[2], /outline: 2px solid/);
  assert.doesNotMatch(rule[2], /border-radius/, "a radius here squares every pill and round button a keyboard reaches");
  assert.match(css, /:where\(:focus-visible\) \{\s*border-radius: 6px;/, "a bare link's ring is softened by a rule that weighs nothing");
});

test("a chip is a 40px target on a touch screen and its wrapped words sit in a soft rectangle", () => {
  assert.match(css, /@media \(pointer: coarse\) \{\s*\.chip \{\s*min-height: 2\.5rem;/);
  const chip = /\n  \.chip \{\s*@apply ([^;]*);/.exec(css);
  assert.ok(chip);
  assert.match(chip[1], /rounded-\[1\.25rem\]/);
  assert.doesNotMatch(chip[1], /rounded-full/);
});

test("a search that finds nothing names the search, says what to try and has one way to clear it", () => {
  const grid = src("components/BrowseGrid.tsx");
  assert.match(grid, /We couldn&rsquo;t find &ldquo;\{q\.trim\(\)\}&rdquo;/);
  assert.match(grid, /any && shown\.length > 0 &&/, "the count row's Clear filters steps aside for the empty state's");
  // the eBay unit is where it was: straight after the clear button, before the ways on
  assert.match(grid, /<\/button>\s*\{elsewhere && <MarketplaceSearch region=\{region\} query=\{elsewhere\} placement="browse-empty" \/>\}\s*<ul/);
});

test("the price history says so when it has snapshots but no line to draw, and is still nothing under MIN_DAYS", () => {
  const days = (n: number, cents: (i: number) => number | null) => Array.from({ length: n }, (_, i) => ({ day: 20000 + i, cents: cents(i), stores: 0 }));
  assert.equal(renderToStaticMarkup(React.createElement(PriceHistoryChart, { values: days(MIN_DAYS - 1, () => null), market: "US" })), "");
  const none = renderToStaticMarkup(React.createElement(PriceHistoryChart, { values: days(MIN_DAYS + 3, () => null), market: "US" }));
  assert.match(none, /No line to draw yet/);
  assert.match(none, new RegExp(`in our ${MIN_DAYS + 3} daily snapshots`));
  assert.match(none, /on none of the days/);
  const one = renderToStaticMarkup(React.createElement(PriceHistoryChart, { values: days(MIN_DAYS + 3, (i) => (i === 2 ? 4999 : null)), market: "US" }));
  assert.match(one, /on one day/);
  assert.doesNotMatch(one, /<svg/);
});

test("the phone menu's title is the region's name, never cut", () => {
  const menu = src("components/MobileMenu.tsx");
  assert.doesNotMatch(menu, /DexCompare \{current\.name\}/);
  assert.match(menu, /<span className="min-w-0 truncate">\{current\.name\}<\/span>/);
});
