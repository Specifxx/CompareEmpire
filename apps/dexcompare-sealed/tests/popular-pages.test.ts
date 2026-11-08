// The landing page's "Popular right now" links (2026-11-08): direct links from the one page Google crawls to the hubs Bing ranks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { popularLinks } from "../src/components/home/PopularPages";
import { TOOLS } from "../src/content/tools";
import { GUIDES } from "../src/content/guides";

test("popular links: the newest set in four regions, the open pre-order, and hubs that exist; on the landing page", () => {
  const links = popularLinks("2026-11-08");
  const hrefs = links.map((l) => l.href);
  assert.ok(hrefs.includes("/us/sets/delta-reign") && hrefs.includes("/ca/sets/delta-reign"), "Delta Reign is the newest set on 2026-11-08");
  assert.ok(hrefs.some((h) => h.startsWith("/us/preorders/")));
  assert.equal(new Set(hrefs).size, hrefs.length, "no duplicates");
  for (const h of hrefs) assert.doesNotMatch(h, /^\/(nz|sg|eu)\//, `${h}: only regions whose detail pages are indexed`);
  assert.ok(TOOLS.some((t) => hrefs.includes(`/us/tools/${t.slug}`)));
  for (const h of hrefs.filter((x) => x.includes("/guides/") && x.startsWith("/us/"))) assert.ok(GUIDES.some((g) => h.endsWith(`/${g.slug}`)), h);
  assert.match(readFileSync(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8"), /<PopularPages \/>/);
  assert.match(readFileSync(new URL("../next.config.js", import.meta.url), "utf8"), /source: "\/card-value", destination: "\/au\/tools\/value-checker"/);
});
