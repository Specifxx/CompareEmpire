import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MKT_ORDER_START, mktNetwork, mktOrder } from "../src/lib/mkt-order";

// The marketplace order test outside the US (owner, 2026-11-24; DECISIONS.md "Marketplace order outside the US, 50/50").
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("starts on 3 Dec (after the freeze and Dex's 3 Dec reads), and is off outside a browser", () => {
  assert.equal(MKT_ORDER_START, Date.parse("2026-12-03T00:00:00Z"));
  assert.equal(mktOrder(Date.parse("2026-12-10T00:00:00Z")), null, "no window: no arm");
});

test("networks are read from the retailer label; a store is no network", () => {
  assert.equal(mktNetwork("eBay (ebay.com.au)"), "ebay");
  assert.equal(mktNetwork("TCGplayer"), "tcg");
  assert.equal(mktNetwork("Amazon AU"), "amz");
  assert.equal(mktNetwork("Kunai Games (CA)"), null);
});

test("arm local only moves TCGplayer below Amazon, only in a non-US Marketplaces block, and adds no words", () => {
  const css = read("src/app/globals.css");
  const rules = css.slice(css.indexOf("The marketplace order test"), css.indexOf("Reduced motion, everywhere"));
  assert.match(rules, /html\[data-mktorder="local"\] \[data-marketplaces\]\[data-us="0"\] > ul > li\[data-row="tcgplayer"\] \{ order: 1; \}/);
  assert.doesNotMatch(rules, /content:|display: none/, "same rows, same words");
  const strip = read("src/components/EbayStrip.tsx");
  assert.match(strip, /data-marketplaces="" data-us=\{nonUs \? "0" : "1"\}/);
  assert.match(strip, /if \(marketplacesBelow && nonUs\) mktOrderSeen\(\)/);
});

test("clicks count once per network per visit, only after a seen, never in the quick view", () => {
  const lib = read("src/lib/mkt-order.ts");
  assert.match(lib, /closest\('\[role="dialog"\]'\)\) return/);
  assert.match(lib, /if \(!sessionStorage\.getItem\(SEEN\)\) return/);
  assert.match(read("src/components/OutboundLink.tsx"), /mktOrderClick\(el, retailer\)/);
  assert.match(read("src/components/AmazonLink.tsx"), /mktOrderClick\(el, amazonLabel\(region\)\)/);
});
