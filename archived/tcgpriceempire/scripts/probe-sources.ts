/**
 * Network-shape probe — NO database, no writes. Run via workflow_dispatch
 * before trusting the importers: it prints what each upstream API actually
 * returns today (totals, first product, whether the setName aggregation the
 * per-set pagination strategy depends on still exists), so a shape change is
 * caught by eyes instead of by a broken nightly import.
 *
 * Always exits 0 — it is informational.
 *
 * Usage: npx tsx scripts/probe-sources.ts
 */
import { GAME_KEYS, GAMES } from "../src/lib/games";
import { fetchPage } from "../src/lib/tcgplayer";

const UA_HEADERS = { "User-Agent": "TCGPriceEmpire/1.0", Accept: "application/json" };
const TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: UA_HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function probeTcgplayer(): Promise<void> {
  for (const key of GAME_KEYS) {
    const line = GAMES[key].tcgProductLine;
    for (const productType of ["Cards", "Sealed Products"]) {
      try {
        const page = await fetchPage(line, 0, { productTypes: [productType] });
        console.log(`\n[tcgplayer] ${key} (${line}) / ${productType}: totalResults=${page.total}`);
        const first = page.items[0];
        if (first) {
          console.log(
            `  first: ${JSON.stringify({
              name: first.productName,
              set: first.setName,
              number: first.customAttributes?.number ?? null,
              marketPrice: first.marketPrice,
            })}`
          );
        } else {
          console.log("  first: (no items)");
        }
        if (page.setAggregation) {
          console.log(`  setName aggregation: ${page.setAggregation.length} buckets`);
          console.log(`  first 5: ${JSON.stringify(page.setAggregation.slice(0, 5))}`);
        } else {
          console.log("  setName aggregation: MISSING — importer will fall back to capped plain pagination");
        }
      } catch (e) {
        console.error(`\n[tcgplayer] ${key} / ${productType} FAILED: ${(e as Error).message}`);
      }
      await sleep(300);
    }
  }
}

async function probeScryfall(): Promise<void> {
  try {
    const index = (await fetchJson("https://api.scryfall.com/bulk-data")) as {
      data?: { type?: string; size?: number; updated_at?: string; download_uri?: string }[];
    };
    const entry = (index?.data ?? []).find((d) => d?.type === "default_cards");
    if (!entry) {
      console.error("\n[scryfall] bulk-data has NO default_cards entry — importer would fail");
      return;
    }
    // Deliberately not downloading the ~400 MB bulk file — the index entry's
    // metadata is enough to confirm the importer's contract.
    console.log(
      `\n[scryfall] default_cards: size=${entry.size ?? "?"} bytes (~${Math.round((entry.size ?? 0) / 1e6)} MB), updated_at=${entry.updated_at ?? "?"}`
    );
  } catch (e) {
    console.error(`\n[scryfall] FAILED: ${(e as Error).message}`);
  }
}

async function probeYgoprodeck(): Promise<void> {
  try {
    const data = (await fetchJson("https://db.ygoprodeck.com/api/v7/cardinfo.php?num=3&offset=0&misc=yes")) as {
      data?: { name?: string; card_prices?: unknown[] }[];
    };
    const cards = data?.data ?? [];
    console.log(`\n[ygoprodeck] sample of ${cards.length} cards:`);
    for (const c of cards) {
      console.log(`  ${c.name ?? "(no name)"} prices=${JSON.stringify(c.card_prices?.[0] ?? null)}`);
    }
  } catch (e) {
    console.error(`\n[ygoprodeck] FAILED: ${(e as Error).message}`);
  }
}

async function main() {
  await probeTcgplayer();
  await probeScryfall();
  await probeYgoprodeck();
  console.log("\nprobe-sources done (informational — always exits 0).");
}

main().catch((e) => {
  // Even a crash exits 0 — this script must never gate anything.
  console.error("probe-sources crashed:", e);
});
