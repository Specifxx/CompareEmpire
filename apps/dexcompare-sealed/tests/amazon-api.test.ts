// Amazon's Creators API prices (2026-11-05): ASINs found by the daily import, prices fetched by the build, shown 24 hours, never committed.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { amazonTitleMatches } from "../scripts/amazon-asins";
import { amazonQuery } from "../src/lib/amazon";
import { amazonSaving, credentialsFor, itemsOf, pickListing, tokenEndpoint, type Item } from "../src/lib/amazon-creators";
import { amazonUrl } from "../src/lib/amazon";
import { identifyAny } from "../src/lib/sealed-title";

test("the token endpoint follows the credential version, else the store's home region", () => {
  assert.equal(tokenEndpoint("3.1", "au"), "https://api.amazon.com/auth/o2/token");
  assert.equal(tokenEndpoint("3.3", "us"), "https://api.amazon.co.jp/auth/o2/token");
  assert.equal(tokenEndpoint(undefined, "uk"), "https://api.amazon.co.uk/auth/o2/token");
  assert.equal(tokenEndpoint(undefined, "au"), "https://api.amazon.co.jp/auth/o2/token");
});

test("one credential serves every store: the AU-named variables are the default, a region's own win", () => {
  const au = { AMAZON_CREATORS_AU_CLIENT_ID: " a ", AMAZON_CREATORS_AU_CLIENT_SECRET: "b", AMAZON_CREATORS_AU_VERSION: "3.3" };
  assert.equal(credentialsFor("us", {}), null);
  assert.deepEqual(credentialsFor("au", au), { id: "a", secret: "b", version: "3.3" });
  assert.deepEqual(credentialsFor("us", au), { id: "a", secret: "b", version: "3.3" });
  assert.deepEqual(credentialsFor("us", { ...au, AMAZON_CREATORS_US_CLIENT_ID: "u", AMAZON_CREATORS_US_CLIENT_SECRET: "v" }), { id: "u", secret: "v", version: "3.1" });
});

const listing = (amount: number, o: Partial<{ cond: string; avail: string; cur: string; box: boolean; seller: string }> = {}) => ({
  price: { money: { amount, currency: o.cur ?? "USD" } },
  condition: { value: o.cond ?? "New" },
  availability: { type: o.avail ?? "IN_STOCK" },
  isBuyBoxWinner: o.box,
  merchantInfo: { name: o.seller ?? "Amazon.com" },
});
const item = (...listings: ReturnType<typeof listing>[]): Item => ({ asin: "B000000001", offersV2: { listings } });

test("the shown price is the new, in-stock buy box in the store's currency, else the cheapest such listing", () => {
  assert.deepEqual(pickListing(item(listing(130), listing(125, { box: true })), "USD"), { amount: 125, seller: undefined });
  assert.deepEqual(pickListing(item(listing(130, { seller: "Card Shop" }), listing(128)), "USD"), { amount: 128, seller: undefined });
  assert.equal(pickListing(item(listing(10, { cond: "Used" })), "USD"), null, "used is never shown");
  assert.equal(pickListing(item(listing(10, { avail: "OUT_OF_STOCK" })), "USD"), null);
  assert.equal(pickListing(item(listing(10, { cur: "AUD" })), "USD"), null, "another currency is another store");
  assert.equal(pickListing({ asin: "B000000001", offersV2: null }, "USD"), null);
  assert.equal(itemsOf({ itemResults: { items: [item()] } }).length, 1);
});

test("an Amazon title matches a product only as the same sealed product (the classifier's groupKey)", () => {
  const id = identifyAny("Pokemon TCG: Scarlet & Violet Destined Rivals Booster Box");
  assert.ok(typeof id === "object", "the fixture title classifies");
  const p = { groupKey: (id as { groupKey: string }).groupKey };
  assert.ok(amazonTitleMatches(p, "Pokémon TCG Scarlet & Violet - Destined Rivals Booster Box (36 Packs)"));
  assert.ok(!amazonTitleMatches(p, "Pokemon TCG: Scarlet & Violet Destined Rivals Elite Trainer Box"), "another product");
  assert.ok(!amazonTitleMatches(p, "Pokemon TCG: Scarlet & Violet Destined Rivals Booster Pack"), "a pack is not a box");
  assert.ok(!amazonTitleMatches(p, "Ultra Pro Destined Rivals Deck Box"), "an accessory");
  assert.ok(!amazonTitleMatches(p, "Pokemon TCG Scarlet & Violet Destined Rivals Booster Box (Japanese)"), "another language");
  assert.equal(amazonQuery("Destined Rivals Booster Box - LIMIT 2 PER CUSTOMER"), "Pokemon Destined Rivals Booster Box");
});

test("the region's own ASIN links to its own Amazon with the tag and the sub id", () => {
  assert.equal(amazonUrl("us", { name: "x", asin: "B0ABCDEFGH" }, "amazon-table"), "https://www.amazon.com/dp/B0ABCDEFGH?tag=riftcompare-20&ascsubtag=dex-us-amazon-table");
  assert.match(amazonUrl("us", { name: "x", asin: "bad" }, "amazon-table")!, /amazon\.com\/s\?/, "a bad ASIN is a search");
});

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));

test("the Creators API client stays script-side; only the product page reads live Amazon prices; prices are never committed", () => {
  for (const f of [...walk("src/app"), ...walk("src/components"), ...walk("src/lib")].filter((f) => /\.tsx?$/.test(f))) {
    const s = readFileSync(f, "utf8");
    if (f !== "src/lib/amazon-creators.ts") assert.ok(!/amazon-creators/.test(s), `${f} imports the Creators API client`);
    if (/from "@\/lib\/amazon-live"/.test(s) && !/import type \{[^}]*\} from "@\/lib\/amazon-live"/.test(s) && !/import \{ AMAZON_CLOCK, type AmazonLive \}/.test(s))
      assert.ok(["src/app/[region]/p/[slug]/page.tsx", "src/app/api/quick/[region]/[slug]/route.ts"].includes(f), `${f} reads live Amazon prices`);
    assert.ok(!/AMAZON_CREATORS/.test(s) || f === "src/lib/amazon-creators.ts", `${f} names the credentials`);
  }
  assert.match(readFileSync(".gitignore", "utf8"), /^data\/amazon-live\/$/m);
  assert.match(JSON.parse(readFileSync("package.json", "utf8")).scripts.build, /\(tsx scripts\/fetch-amazon-prices\.ts \|\| true\) && next build/);
  assert.match(readFileSync("next.config.js", "utf8"), /data\/amazon-live\/\*\.json/);
  assert.match(readFileSync("../../.github/workflows/dexcompare-sealed-import.yml", "utf8"), /scripts\/amazon-asins\.ts/);
  assert.match(readFileSync("scripts/publish-public-data.sh", "utf8"), /AMAZON_DIR="apps\/dexcompare-sealed\/data\/amazon"/);
});

test("the quick view's Amazon row is the product page's tagged link, never Amazon's price (owner, 2026-11-06)", () => {
  const src = readFileSync("src/app/api/quick/[region]/[slug]/route.ts", "utf8");
  assert.doesNotMatch(src, /amazon: null/, "the quick view keeps the Amazon link");
  assert.match(src, /const amazonLink = found \? \{ asin: found\.asin, url: found\.url \} : null;/, "the link only: the price stays on the product page");
  assert.match(src, /amazon: amazonLink, noAmazon: !amazonCarries\(type\?\.key, !!found\) \}/);
});

test("Amazon's row only for types Amazon carries (owner, 2026-11-12)", async () => {
  const { amazonCarries } = await import("../src/lib/amazon");
  for (const t of ["booster-box", "etb", "booster-pack", "tin"]) assert.equal(amazonCarries(t), true, t);
  for (const t of ["booster-box-case", "etb-case", "jp-booster-box", null]) assert.equal(amazonCarries(t), false, String(t));
  assert.equal(amazonCarries("jp-booster-box", true), true, "a real ASIN wins");
});

// Owner, 2026-11-26: DexCompare earns the most, so it takes more of the network's Amazon allowance, spent where its
// visitors click, and a popular product's miss is retried within days (Delta Reign waited 30 days and missed its launch).
test("Amazon budget: US first and largest, env can only lower it", async () => {
  const { searchBudget, SEARCH_BUDGET } = await import("../scripts/amazon-asins");
  const { buildCalls, BUILD_CALLS } = await import("../scripts/fetch-amazon-prices");
  assert.equal(SEARCH_BUDGET.us, 800);
  assert.equal(BUILD_CALLS.us, 100);
  for (const r of ["uk", "ca", "au", "eu"] as const) {
    assert.ok(SEARCH_BUDGET[r]! <= 300 && BUILD_CALLS[r]! <= 50, r);
  }
  assert.equal(searchBudget("us", {}), 800);
  assert.equal(searchBudget("us", { AMAZON_SEARCH_BUDGET: "100" }), 100);
  assert.equal(searchBudget("us", { AMAZON_SEARCH_BUDGET: "5000" }), 800);
  assert.equal(searchBudget("us", { AMAZON_SEARCH_BUDGET: "0" }), 0);
  assert.equal(buildCalls("us", { AMAZON_BUILD_CALLS: "9999" }), 100);
  assert.equal(buildCalls("uk", {}), 50);
  assert.equal(searchBudget("nz" as never, {}), 0);
});

test("Amazon misses: a clicked product is retried in 3 days, the rest in 14", async () => {
  const { missRecheckDays, amazonTitleQuery } = await import("../scripts/amazon-asins");
  assert.equal(missRecheckDays(40), 3);
  assert.equal(missRecheckDays(5), 3);
  assert.equal(missRecheckDays(0), 14);
  assert.equal(amazonTitleQuery("Delta Reign Booster Box"), "Pokemon TCG: Delta Reign Booster Box");
  assert.equal(amazonTitleQuery("Pokemon TCG Prismatic Evolutions Elite Trainer Box"), "Pokemon TCG: Prismatic Evolutions Elite Trainer Box");
});

test("Amazon order: most-clicked products are searched and priced first", async () => {
  const { demandClicks } = await import("../scripts/amazon-shared");
  assert.deepEqual(demandClicks("/no/such/file.json"), {});
  const src = readFileSync("scripts/amazon-shared.ts", "utf8");
  assert.match(src, /b\.clicks - a\.clicks \|\| b\.prices\.length - a\.prices\.length/);
});

test("Amazon's own saving and deal badge ride on the shown listing, only when sane and open to everyone (Black Friday, 2026-11-27)", () => {
  const l = (savings: unknown, dealDetails?: unknown) =>
    ({ condition: { value: "New" }, availability: { type: "IN_STOCK" }, price: { money: { amount: 30, currency: "USD" }, savings }, dealDetails }) as never;
  assert.deepEqual(amazonSaving(l({ percentage: 24.6, money: { amount: 9.8, currency: "USD" } }), "USD"), { off: 25 });
  assert.deepEqual(amazonSaving(l({ percentage: 3 }), "USD"), {}, "under 5% is noise");
  assert.deepEqual(amazonSaving(l({ percentage: 92 }), "USD"), {}, "a list price nobody pays");
  assert.deepEqual(amazonSaving(l({ percentage: 30, money: { currency: "CAD" } }), "USD"), {}, "another currency");
  assert.deepEqual(amazonSaving(l(null, { badge: "Black Friday Deal", accessType: "ALL" }), "USD"), { deal: "Black Friday Deal" });
  assert.deepEqual(amazonSaving(l(null, { badge: "Prime Exclusive Deal", accessType: "PRIME_EXCLUSIVE" }), "USD"), {});
  assert.deepEqual(amazonSaving(l(null, { badge: "Lightning Deal", endTime: "2020-01-01T00:00:00Z" }), "USD"), {});
  assert.deepEqual(amazonSaving(l(null, { badge: "<b>Deal</b>" }), "USD"), {});
  const picked = pickListing({ asin: "B000000001", offersV2: { listings: [l({ percentage: 20 }, { badge: "Black Friday Deal" })] } }, "USD");
  assert.deepEqual(picked, { amount: 30, seller: undefined, off: 20, deal: "Black Friday Deal" });
});
