import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { setAlertLabel, setAlertPick } from "../src/lib/set-alert";

const p = (slug: string, productType: string, lowestPriceCents: number | null, inStockStores = 1, marketplaceOpen = false) => ({
  slug,
  name: slug,
  productType,
  lowestPriceCents,
  inStockStores,
  marketplaceOpen,
});

test("a set's alert follows its booster box, else ETB, else bundle; open first, then cheapest", () => {
  assert.equal(setAlertPick([p("etb", "Elite Trainer Box", 5000), p("box", "Booster Box", 15000)])?.slug, "box");
  assert.equal(setAlertPick([p("blister", "Blister", 1500), p("bundle", "Booster Bundle", 3000), p("etb", "Elite Trainer Box", 5000)])?.slug, "etb");
  assert.equal(setAlertPick([p("box-sold", "Booster Box", 9000, 0), p("box-open", "Booster Box", 16000)])?.slug, "box-open");
  assert.equal(setAlertPick([p("b", "Booster Box", 16000), p("a", "Booster Box", 15000)])?.slug, "a");
  assert.equal(setAlertPick([p("tcg", "Booster Box", 14000, 0, true), p("none", "Booster Box", null, 0)])?.slug, "tcg");
  assert.equal(setAlertPick([p("blister", "Blister", 1500), p("tin", "Tin", 2000)]), null, "no headline product, no alert");
});

test("the button names the product and says what the alert does", () => {
  assert.equal(setAlertLabel("Delta Reign", p("x", "Booster Box", 15000)), "Email me when the Delta Reign booster box drops");
  assert.equal(setAlertLabel("Delta Reign", p("x", "Elite Trainer Box", null, 0)), "Email me when the Delta Reign Elite Trainer Box is in stock at my price");
});

test("the set page draws one alert, a button in the server HTML, above the products", () => {
  const page = fs.readFileSync("src/app/[region]/sets/[set]/page.tsx", "utf8");
  assert.equal(page.match(/<PriceAlertForm/g)?.length, 1);
  assert.match(page.slice(page.indexOf("<PriceAlertForm")), /^<PriceAlertForm[^>]*\bprominent\b/s);
  assert.ok(page.indexOf("<PriceAlertForm") < page.indexOf('id="products"'));
});
