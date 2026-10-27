import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SISTER_SITES } from "../src/lib/site";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("footer: the sister sites, as plain followed links", () => {
  assert.deepEqual(
    SISTER_SITES.map((s) => s.url),
    ["https://riftcompare.com", "https://opcompare.app", "https://mtgcompare.app", "https://gundamcompare.com", "https://lorcanacompare.com", "https://ygocompare.com", "https://www.camcompare.app", "https://www.compareempire.com"],
  );
  const footer = src("src/components/Footer.tsx");
  assert.match(footer, /SISTER_SITES\.map/);
  assert.match(footer, /rel="noopener"/);
  assert.doesNotMatch(footer, /nofollow|sponsored/);
});
