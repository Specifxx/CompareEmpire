import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { activeStoreCode, CODE_RECHECK_DAYS, STORE_CODES, type StoreCode } from "@/lib/store-codes";

const SAMPLE: StoreCode[] = [{ host: "shop.example", name: "Shop", code: "DEX5", offer: "5% off", checked: "2026-11-24" }];
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

test("a code shows for its store's host or URL, with or without www", () => {
  assert.equal(activeStoreCode("shop.example", at("2026-11-25"), SAMPLE)?.code, "DEX5");
  assert.equal(activeStoreCode("www.shop.example", at("2026-11-25"), SAMPLE)?.code, "DEX5");
  assert.equal(activeStoreCode("https://www.shop.example/products/x", at("2026-11-25"), SAMPLE)?.code, "DEX5");
  assert.equal(activeStoreCode("other.example", at("2026-11-25"), SAMPLE), null);
  assert.equal(activeStoreCode(null, at("2026-11-25"), SAMPLE), null);
});

test("a code nobody re-checked, or past its end, disappears", () => {
  assert.equal(activeStoreCode("shop.example", at("2027-01-30"), SAMPLE), null);
  assert.equal(activeStoreCode("shop.example", at("2026-12-01"), [{ ...SAMPLE[0], until: "2026-12-01" }]), null);
  assert.equal(CODE_RECHECK_DAYS, 30);
});

test("Cardboard Hero's COMPEMP5 is live from 24 Nov 2026", () => {
  assert.equal(activeStoreCode("cardboardhero.com", at("2026-11-24"))?.code, "COMPEMP5");
  for (const c of STORE_CODES) assert.match(c.host, /^[a-z0-9.-]+$/);
});

test("nothing that sorts or ranks reads the codes (a label, never a re-rank)", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk("src");
  const readers = files.filter((f) => /from "@\/lib\/store-codes"/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/")).sort();
  assert.deepEqual(readers, ["src/components/StoreCodeChip.tsx"]);
});
