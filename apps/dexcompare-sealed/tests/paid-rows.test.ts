// Owner, 2026-11-12: "we just want eBay and TCGplayer as the paid links at the top". Owner, 2026-11-17 ("we should have an option to
// check on Amazon in our price rows"): with no Amazon price the row is an unpriced "Check on Amazon" row, an ordinary LAST row, never
// pinned. Source guard.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Amazon (priced or the unpriced Check row) is an affiliated row at the top (owner, 2026-11-17)", () => {
  const t = readFileSync(new URL("../src/components/OfferTable.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(t, /if \(!live\?\.cents \|\| !live\.at \|\| !clock\) return null;/);
  assert.match(t, /Check on Amazon/);
  const e = readFileSync(new URL("../src/components/EbayStrip.tsx", import.meta.url), "utf8");
  assert.match(e, /\.\.\.\(amazon \? \[\{ key: amazon\.key/);
  assert.doesNotMatch(e, /amazon && !amazon\.live &&/);
  assert.match(e, /const pinSlots: Slot\[\] = \[\s+\{ key: EBAY_ROW_KEY/);
});

test("the product page no longer carries a separate below-table Amazon line (the row replaces it)", () => {
  const p = readFileSync(new URL("../src/app/[region]/p/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(p, /AmazonBelowTable/);
});
