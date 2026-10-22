// The pre-order hub's links (components/PreorderBanner.tsx): from the region home, the landing page and the set's product pages,
// generic over lib/preorder-guides.ts, gone on release day; the hub itself stays in the sitemap until then.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreorderBanner, PreorderRegionLinks } from "../src/components/PreorderBanner";
import { openPreorderGuides } from "../src/lib/preorder-guides";
import { REGION_LIST } from "../src/lib/regions";
import { staticSitemap } from "../src/lib/sitemap";
import { SITE_URL } from "../src/lib/site";

(globalThis as unknown as { React: typeof React }).React = React;

test("before release: the Delta Reign banner links the region's hub, with the date and how far off it is", () => {
  const html = renderToStaticMarkup(React.createElement(PreorderBanner, { region: "au", today: "2026-10-22" }));
  assert.match(html, /href="\/au\/preorders\/delta-reign"/);
  assert.match(html, /out 6 November 2026/);
  assert.match(html, /releases in 15 days/);
  assert.doesNotMatch(html, /\$|£|€/, "no price in a cached banner");
});

test("the landing page links the hub in all seven regions", () => {
  const html = renderToStaticMarkup(React.createElement(PreorderRegionLinks, { today: "2026-10-22" }));
  for (const r of REGION_LIST) assert.match(html, new RegExp(`href="/${r.region}/preorders/delta-reign"`), r.region);
});

test("on and after release day: no banner (the registry retires it), and the hub leaves the sitemap", () => {
  assert.equal(renderToStaticMarkup(React.createElement(PreorderBanner, { region: "au", today: "2026-11-06" })), "");
  assert.equal(renderToStaticMarkup(React.createElement(PreorderRegionLinks, { today: "2026-11-06" })), "");
  assert.equal(openPreorderGuides("2026-11-06").length, 0);
  const before = staticSitemap({}, undefined, "2026-10-22").map((e) => e.url);
  const after = staticSitemap({}, undefined, "2026-11-06").map((e) => e.url);
  for (const r of REGION_LIST) {
    assert.ok(before.includes(`${SITE_URL}/${r.region}/preorders/delta-reign`), r.region);
    assert.ok(!after.includes(`${SITE_URL}/${r.region}/preorders/delta-reign`), r.region);
  }
});
