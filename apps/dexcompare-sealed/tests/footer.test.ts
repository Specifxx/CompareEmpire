import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SISTER_SITES } from "../src/lib/site";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("footer: the sister sites, as plain followed links", () => {
  assert.deepEqual(
    SISTER_SITES.map((s) => s.url),
    ["https://riftcompare.com", "https://opcompare.app", "https://mtgcompare.app", "https://gundamcompare.com", "https://lorcanacompare.com", "https://ygocompare.com", "https://cyberpunkcompare.com", "https://wargamecompare.com", "https://figurecompare.com", "https://www.camcompare.app", "https://compareempire.com"],
  );
  // Owner, 2026-11-02: never tie a sister site to one country.
  for (const s of SISTER_SITES) assert.doesNotMatch(s.what, /\b(Australian|Aussie|American|British|Canadian|Australia only|AU only)\b/i, s.name);
  const footer = src("src/components/Footer.tsx");
  assert.match(footer, /SISTER_SITES\.map/);
  assert.match(footer, /rel="noopener"/);
  assert.doesNotMatch(footer, /nofollow|sponsored/);
});
