// Finds each product's ASIN on its region's own Amazon (AU, US, UK, CA, DE for the eurozone) with the Creators API's
// searchItems, in the daily import (sealed-import.yml, after the export). A result counts only when the sealed classifier
// (lib/sealed-title.ts identifyAny) reads its title as the SAME product (the same groupKey): ten results, no match, no ASIN;
// a wrong merge is worse than a missing price, as with the stores. Found ASINs and misses go in
// data/amazon/asins-<region>.json (ASINs may be stored; prices never are) and ride the publish commit; a miss is retried
// after a few days for a product visitors click, else after 14 (missRecheckDays); a miss is searched a second time with
// Amazon's own title form ("Pokémon TCG: ...") before it is recorded. Without credentials it does nothing; a store whose account has no API access yet (403) ends that region
// quietly and the next still runs. data/amazon/status-<region>.json says what the last run did.
//   npx tsx scripts/amazon-asins.ts            searchItems a day: US 800, other regions 300 (SEARCH_BUDGET; owner, 2026-11-26:
//   DexCompare earns the most, so it takes more of the network's shared allowance; AMAZON_SEARCH_BUDGET can only lower it)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { amazonFor, amazonQuery } from "../src/lib/amazon";
import { AmazonRefused, credentialsFor, creatorsClient, MARKETS } from "../src/lib/amazon-creators";
import type { AsinFile } from "../src/lib/amazon-live";

import type { Region } from "../src/lib/regions";
import { identifyAny } from "../src/lib/sealed-title";
import { regionProducts, type PubProduct } from "./amazon-shared";

const DIR = path.join(process.cwd(), "data", "amazon");
export const API_REGIONS: Region[] = ["au", "us", "uk", "ca", "eu"];
/** searchItems calls a region a day (owner, 2026-11-26). The env var can only lower it. */
export const SEARCH_BUDGET: Partial<Record<Region, number>> = { us: 800, uk: 300, ca: 300, au: 300, eu: 300 };
export const searchBudget = (r: Region, env: Record<string, string | undefined> = process.env) => {
  const cap = SEARCH_BUDGET[r] ?? 0;
  const asked = Number(env.AMAZON_SEARCH_BUDGET);
  return Number.isFinite(asked) && asked >= 0 && env.AMAZON_SEARCH_BUDGET?.trim() ? Math.min(cap, asked) : cap;
};
/** Clicks over 28 days that make a product "hot": its miss is retried every HOT_RECHECK_DAYS, not every COLD_RECHECK_DAYS
 *  (a new set like Delta Reign is often listed on Amazon days after the stores; a 30-day wait missed its whole launch). */
export const HOT_CLICKS = 5;
export const HOT_RECHECK_DAYS = 3;
export const COLD_RECHECK_DAYS = 14;
export const missRecheckDays = (clicks: number) => (clicks >= HOT_CLICKS ? HOT_RECHECK_DAYS : COLD_RECHECK_DAYS);
/** Amazon's own title form, tried when the plain query finds nothing that is this product. */
export const amazonTitleQuery = (name: string) => `Pokemon TCG: ${amazonQuery(name).replace(/^pokemon\s+(?:tcg:?\s+)?/i, "")}`;

/** Whether an Amazon title is this product and no other: the classifier files it under the product's own groupKey. */
export function amazonTitleMatches(p: Pick<PubProduct, "groupKey">, title: string): boolean {
  const id = identifyAny(title);
  return typeof id === "object" && id.groupKey === p.groupKey;
}

async function region(r: Region) {
  const store = amazonFor(r);
  if (!store || !MARKETS[r]) return;
  const FILE = path.join(DIR, `asins-${r}.json`);
  const status = (o: object) => writeFileSync(path.join(DIR, `status-${r}.json`), JSON.stringify({ at: new Date().toISOString(), ...o }) + "\n");
  mkdirSync(DIR, { recursive: true });
  const creds = credentialsFor(r);
  if (!creds) {
    status({ state: "off" });
    return console.log(`Amazon ASINs ${r}: no AMAZON_CREATORS_* credentials yet, skipped.`);
  }
  const budget = searchBudget(r);
  const today = new Date().toISOString().slice(0, 10);
  const known: AsinFile = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
  const products = regionProducts(r);
  const live = new Set(products.map((x) => x.p.slug));
  // Never searched first, then due misses; each group most-clicked first (regionProducts' order).
  const due = products.filter(({ p, clicks }) => {
    const k = known[p.slug];
    if (k?.asin) return false;
    return !k || (Date.parse(today) - Date.parse(k.checked)) / 864e5 >= missRecheckDays(clicks);
  });
  const todo = [...due.filter(({ p }) => !known[p.slug]), ...due.filter(({ p }) => known[p.slug])];
  const api = await creatorsClient(r, store.tag, creds).catch((e) => {
    console.log(`Amazon ASINs ${r}: ${(e as Error).message} (no Creators API access yet?), skipped.`);
    status({ state: "refused", note: (e as Error).message.slice(0, 120) });
    return null;
  });
  if (!api) return;
  let found = 0, searched = 0, refused = "";
  let calls = 0;
  for (const { p } of todo) {
    if (calls >= budget) break;
    try {
      const search = async (keywords: string) => {
        calls++;
        const items = await api.call("searchItems", { keywords, resources: ["itemInfo.title"], itemCount: 10 });
        return items.find((it) => amazonTitleMatches(p, it.itemInfo?.title?.displayValue ?? ""));
      };
      let hit = await search(amazonQuery(p.name));
      if (!hit && calls < budget) hit = await search(amazonTitleQuery(p.name));
      searched++;
      known[p.slug] = { asin: hit?.asin ?? null, checked: today };
      if (hit) found++;
    } catch (e) {
      console.log(`Amazon ASINs ${r}: stopped at ${p.slug}: ${(e as Error).message}`);
      if (e instanceof AmazonRefused) {
        refused = (e as Error).message.slice(0, 120);
        break;
      }
    }
  }
  // Products gone from the region drop out, so the file stays the size of the catalogue.
  const out = Object.fromEntries(Object.entries(known).filter(([k]) => live.has(k)).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(FILE, JSON.stringify(out, null, 0).replace(/},"/g, '},\n"') + "\n");
  const asins = Object.values(out).filter((e) => e.asin).length;
  status({ state: refused && !searched ? "refused" : "ok", searched, calls, found, known: asins, waiting: Math.max(0, todo.length - searched), ...(refused ? { note: refused } : {}) });
  console.log(`Amazon ASINs ${r}: ${searched} searched, ${found} found, ${asins} known, ${Math.max(0, todo.length - searched)} waiting.`);
}

async function main() {
  for (const r of API_REGIONS) await region(r).catch((e) => console.log(`Amazon ASINs ${r} skipped: ${(e as Error).message}`));
}

if (process.argv[1] && /amazon-asins\.ts$/.test(process.argv[1])) main().catch((e) => console.log(`Amazon ASINs skipped: ${(e as Error).message}`));
