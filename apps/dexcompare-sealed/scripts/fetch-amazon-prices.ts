// Runs first in every Vercel build: today's Amazon prices, in every region with its own Amazon (AU, US, UK, CA, EU), for
// the ASINs scripts/amazon-asins.ts found, written to data/amazon-live/<region>.json (git-ignored). Amazon's licence lets
// a price be kept for 24 hours and shown with its time, so prices are fetched by each build and never committed; the
// product page shows one only while under 24 hours old (lib/amazon-live.ts) and the browser hides it after that.
// Most-clicked products first (data/demand.json), BUILD_CALLS getItems calls a region (ten ASINs each, one a second: US 100,
// other regions 50, owner 2026-11-26: DexCompare earns the most of the network's shared allowance; AMAZON_BUILD_CALLS can
// only lower it; under two minutes of build for the US). A price under 60% or over 160% of the product's in-stock store median is dropped (a
// different count, a marketplace seller's fantasy). Without credentials, or on any error, it writes nothing and never
// fails the build; a store whose account has no API access yet (403) is skipped and the next region still runs.
//   npx tsx scripts/fetch-amazon-prices.ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { amazonFor } from "../src/lib/amazon";
import { AmazonRefused, credentialsFor, creatorsClient, MARKETS, pickListing, PRICE_RESOURCES } from "../src/lib/amazon-creators";
import type { AsinFile, LiveFile } from "../src/lib/amazon-live";
import type { Region } from "../src/lib/regions";
import { median, regionProducts } from "./amazon-shared";

const API_REGIONS: Region[] = ["au", "us", "uk", "ca", "eu"];
/** getItems calls a region a build (owner, 2026-11-26). The env var can only lower it. */
export const BUILD_CALLS: Partial<Record<Region, number>> = { us: 100, uk: 50, ca: 50, au: 50, eu: 50 };
export const buildCalls = (r: Region, env: Record<string, string | undefined> = process.env) => {
  const cap = BUILD_CALLS[r] ?? 0;
  const asked = Number(env.AMAZON_BUILD_CALLS);
  return env.AMAZON_BUILD_CALLS?.trim() && Number.isFinite(asked) && asked >= 0 ? Math.min(cap, asked) : cap;
};
const asinsFile = (r: Region) => path.join(process.cwd(), "data", "amazon", `asins-${r}.json`);
const OUT_DIR = path.join(process.cwd(), "data", "amazon-live");

async function region(r: Region) {
  const store = amazonFor(r);
  const market = MARKETS[r];
  if (!store || !market) return;
  const creds = credentialsFor(r);
  if (!creds || !existsSync(asinsFile(r))) return console.log(`Amazon prices ${r}: no credentials or no ASINs yet, skipped.`);
  const known = JSON.parse(readFileSync(asinsFile(r), "utf8")) as AsinFile;
  const wanted = regionProducts(r).filter((x) => known[x.p.slug]?.asin);
  const todo = wanted.slice(0, buildCalls(r) * 10);
  if (!todo.length) return console.log(`Amazon prices ${r}: no ASINs for in-stock products yet.`);
  const api = await creatorsClient(r, store.tag, creds);
  const fetchedAt = new Date().toISOString();
  const prices: LiveFile["prices"] = {};
  // Why an ASIN got no price, so the build log says whether Amazon had nothing to sell or we dropped its price.
  const dropped = { missing: 0, noNewInStock: 0, under60: 0, over160: 0 };
  for (let i = 0; i < todo.length; i += 10) {
    const batch = todo.slice(i, i + 10);
    const ids = [...new Set(batch.map((x) => known[x.p.slug].asin!))];
    let items;
    try {
      items = await api.call("getItems", { itemIds: ids, itemIdType: "ASIN", resources: PRICE_RESOURCES });
    } catch (e) {
      console.log(`Amazon prices ${r}: ${(e as Error).message}`);
      if (e instanceof AmazonRefused) break;
      continue;
    }
    for (const x of batch) {
      const asin = known[x.p.slug].asin!;
      const it = items.find((it) => it.asin === asin);
      if (!it) {
        dropped.missing++;
        continue;
      }
      const pick = pickListing(it, market.currency);
      if (!pick) {
        dropped.noNewInStock++;
        continue;
      }
      const cents = Math.round(pick.amount * 100);
      const ref = median(x.prices);
      if (ref && cents < ref * 0.6) {
        dropped.under60++;
        continue;
      }
      if (ref && cents > ref * 1.6) {
        dropped.over160++;
        console.log(`Amazon prices ${r}: ${x.p.slug} dropped, ${cents} cents is over 160% of the store median ${ref}.`);
        continue;
      }
      prices[x.p.slug] = { asin, cents };
    }
  }
  const why = `not priced: ${dropped.missing} not returned, ${dropped.noNewInStock} no new in-stock listing, ${dropped.under60} under 60% and ${dropped.over160} over 160% of the store median`;
  if (!Object.keys(prices).length) return console.log(`Amazon prices ${r}: none (${api.calls()} calls; ${why}).`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, `${r}.json`), JSON.stringify({ fetchedAt, prices } satisfies LiveFile) + "\n");
  console.log(`Amazon prices ${r}: ${Object.keys(prices).length} of ${todo.length} ASINs priced in ${api.calls()} calls; ${why}.`);
}

async function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const r of API_REGIONS) await region(r).catch((e) => console.log(`Amazon prices ${r} skipped: ${(e as Error).message}`));
}

if (process.argv[1] && /fetch-amazon-prices\.ts$/.test(process.argv[1])) main().catch((e) => console.log(`Amazon prices skipped: ${(e as Error).message}`));
