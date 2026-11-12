// Owner, 2026-11-12: "we just want eBay and TCGplayer as the paid links at the top". Source guard: Amazon draws a row only
// with a real price, never as a search row.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the Amazon row needs a real price: no price, no row", () => {
  const s = readFileSync(new URL("../src/components/OfferTable.tsx", import.meta.url), "utf8");
  assert.match(s, /if \(!live\?\.cents \|\| !live\.at \|\| !clock\) return null;/);
});
