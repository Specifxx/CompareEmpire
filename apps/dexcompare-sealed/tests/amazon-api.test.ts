// Amazon's Creators API prices (2026-11-05): ASINs found by the daily import, prices fetched by the build, shown 24 hours, never committed.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { amazonTitleMatches } from "../scripts/amazon-asins";
import { amazonQuery } from "../src/lib/amazon";
import { credentialsFor, itemsOf, pickListing, tokenEndpoint, type Item } from "../src/lib/amazon-creators";
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
