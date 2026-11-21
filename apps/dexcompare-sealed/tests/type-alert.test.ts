import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { typeAlertLabel, typeAlertPick } from "../src/lib/type-alert";

const p = (slug: string, lowestPriceCents: number | null, inStockStores = 1, marketplaceOpen = false) => ({
  slug,
  name: slug,
  productType: "Booster Box",
  lowestPriceCents,
  inStockStores,
  marketplaceOpen,
});
const asIs = <T,>(xs: readonly T[]) => xs;
const reversed = <T,>(xs: readonly T[]) => [...xs].reverse();

test("a type's alert follows the ranking's first open product, else its first sold-out one", () => {
  assert.equal(typeAlertPick([p("a", 100), p("b", 200)], [], asIs)?.slug, "a");
  assert.equal(typeAlertPick([p("a", 100), p("b", 200)], [], reversed)?.slug, "b", "the ranking decides, not the price order");
  assert.equal(typeAlertPick([p("gone", 100, 0)], [p("sold", null, 0)], asIs)?.slug, "sold", "an open list with nothing open falls to sold out");
  assert.equal(typeAlertPick([p("tcg", 100, 0, true)], [], asIs)?.slug, "tcg", "TCGplayer-only counts as open");
  assert.equal(typeAlertPick([], [], asIs), null);
});

test("the button names the product and says what the alert does", () => {
  assert.equal(typeAlertLabel({ ...p("x", 15000), name: "Delta Reign Booster Box" }), "Email me when the Delta Reign Booster Box drops");
  assert.equal(typeAlertLabel({ ...p("x", null, 0), name: "Delta Reign Booster Box" }), "Email me when the Delta Reign Booster Box is in stock at my price");
});

test("the type page draws one alert, a button in the server HTML, above the products", () => {
  const page = fs.readFileSync("src/app/[region]/type/[type]/page.tsx", "utf8");
  assert.equal(page.match(/<PriceAlertForm/g)?.length, 1);
  assert.match(page.slice(page.indexOf("<PriceAlertForm")), /^<PriceAlertForm[^>]*\bprominent\b/s);
  assert.ok(page.indexOf("<PriceAlertForm") < page.indexOf('id="in-stock"'));
});

test("the Ultra-Premium Collection hub draws one alert per 30th Celebration box, in the featured cards, above the grid", () => {
  const page = fs.readFileSync("src/app/[region]/ultra-premium-collections/page.tsx", "utf8");
  assert.equal(page.match(/<PriceAlertForm/g)?.length, 1, "one form, drawn inside the Day / Night map");
  assert.match(page.slice(page.indexOf("<PriceAlertForm")), /^<PriceAlertForm[^>]*\bprominent\b/s);
  assert.ok(page.indexOf('id="30th-celebration"') < page.indexOf("<PriceAlertForm"));
  assert.ok(page.indexOf("<PriceAlertForm") < page.indexOf('id="in-stock"'));
  assert.equal(typeAlertLabel({ ...p("x", 17999), name: "Day UPC" }), "Email me when the Day UPC drops");
});
