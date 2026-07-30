// READ-ONLY validation probe for the configured retailers. For each store it runs
// the EXACT production code path — auto-discover Pokémon collections from the store's
// sitemap, fetch the collection feeds, and resolve every listing title to one of our
// cards with the same buildPokemonResolver the importer uses — then reports how many
// products it found, how many matched a card, how many are in stock, and a few sample
// matches (title → card @ price) so the matches can be eyeballed for correctness.
//
// No database writes. Runs on CI (needs DATABASE_URL + open network), mirroring the
// import which can't run from the dev container. This is how we validate a new store
// is real, is Shopify, sells Pokémon singles, and matches our catalogue BEFORE we
// trust its prices.
//
//   DATABASE_URL=... npx tsx scripts/probe-stores.ts [US|GB|AU|NZ|all|key1,key2,...]
import { prisma } from "../src/lib/db";
import { RETAILER_LIST, retailerCountry, type RetailerInfo } from "../src/lib/retailers";
import {
  buildPokemonResolver,
  discoverOnePieceCollections,
  fetchCollection,
  type MatchCard,
} from "../src/lib/price-import";

const CUR: Record<string, string> = { AU: "A$", NZ: "NZ$", US: "US$", GB: "£" };

interface StoreReport {
  key: string;
  name: string;
  country: string;
  base: string;
  collections: string[];
  fromFallback: boolean;
  products: number;
  matched: number;
  inStockMatched: number;
  samples: string[];
  error?: string;
}

async function probeStore(
  store: RetailerInfo,
  resolve: (t: string) => string | null,
  nameById: Map<string, { name: string; num: string }>
): Promise<StoreReport> {
  const cc = retailerCountry(store.key);
  const rep: StoreReport = {
    key: store.key, name: store.name, country: cc, base: store.base,
    collections: [], fromFallback: false, products: 0, matched: 0, inStockMatched: 0, samples: [],
  };
  try {
    // Mirror the importer EXACTLY: discovery is authoritative; only fall back to
    // configured handles (filtered to Pokémon) if the sitemap yields nothing.
    let handles = await discoverOnePieceCollections(store.base);
    if (!handles.length) {
      handles = (store.collections ?? []).filter((h) => /pok[eé]mon|pkmn/i.test(h));
      rep.fromFallback = handles.length > 0;
    }
    rep.collections = handles;
    if (!handles.length) return rep;

    const seen = new Set<string>();
    const products: { title: string; handle: string; variants: { title: string; price: string; available: boolean }[] }[] = [];
    for (const h of handles) {
      for (const p of await fetchCollection(store, h)) {
        if (seen.has(p.handle)) continue;
        seen.add(p.handle);
        products.push(p);
      }
    }
    rep.products = products.length;

    for (const p of products) {
      const cardId = resolve(p.title);
      if (!cardId) continue;
      rep.matched++;
      const priced = p.variants.filter((v) => parseFloat(v.price) > 0);
      const avail = priced.filter((v) => v.available);
      const inStock = avail.length > 0;
      if (inStock) rep.inStockMatched++;
      if (rep.samples.length < 5 && priced.length) {
        const best = (inStock ? avail : priced)[0];
        const card = nameById.get(cardId);
        rep.samples.push(
          `      "${p.title.slice(0, 58)}" → ${card?.name ?? cardId} [${card?.num ?? "?"}] @ ${CUR[cc] ?? ""}${best.price}${inStock ? "" : " (OOS)"}`
        );
      }
    }
  } catch (e) {
    rep.error = (e as Error).message;
  }
  return rep;
}

async function main() {
  const filter = (process.argv[2] || "all").trim();
  const isCountry = /^(US|GB|AU|NZ|all)$/i.test(filter);
  const wantKeys = isCountry ? null : new Set(filter.split(",").map((s) => s.trim()));
  const stores = RETAILER_LIST.filter((s) => {
    if (wantKeys) return wantKeys.has(s.key);
    if (/^all$/i.test(filter)) return true;
    return retailerCountry(s.key).toUpperCase() === filter.toUpperCase();
  });

  console.log(`Probing ${stores.length} stores (filter="${filter}")…\n`);

  const cards = await prisma.card.findMany({ select: { id: true, name: true, setName: true, collectorNumber: true } });
  console.log(`Loaded ${cards.length} cards for matching.\n`);
  const resolve = buildPokemonResolver(cards as MatchCard[]);
  const nameById = new Map(cards.map((c) => [c.id, { name: c.name, num: c.collectorNumber }]));

  // Concurrency pool so the probe finishes quickly without hammering any one store.
  const POOL = 6;
  const reports: StoreReport[] = [];
  let idx = 0;
  async function worker() {
    while (idx < stores.length) {
      const store = stores[idx++];
      const r = await probeStore(store, resolve, nameById);
      reports.push(r);
      const tag = r.error ? `ERROR ${r.error}` : `${r.products} products → ${r.matched} matched (${r.inStockMatched} in stock)`;
      const disc = r.collections.length ? ` [${r.collections.length} coll${r.fromFallback ? ", fallback" : ""}]` : " [NO COLLECTIONS]";
      console.log(`  ${r.matched > 0 ? "✓" : "✗"} ${r.name} (${r.country})${disc}: ${tag}`);
      if (r.samples.length) console.log(r.samples.join("\n"));
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));

  // Summary, sorted by matched desc.
  reports.sort((a, b) => b.matched - a.matched);
  console.log(`\n===== SUMMARY (filter="${filter}") =====`);
  const byCountry = new Map<string, StoreReport[]>();
  for (const r of reports) {
    if (!byCountry.has(r.country)) byCountry.set(r.country, []);
    byCountry.get(r.country)!.push(r);
  }
  for (const [cc, list] of byCountry) {
    const ok = list.filter((r) => r.matched > 0);
    console.log(`\n--- ${cc}: ${ok.length}/${list.length} stores return Pokémon matches ---`);
    for (const r of list) {
      const flag = r.matched >= 100 ? "✓✓" : r.matched > 0 ? "✓ " : r.error ? "ER" : "✗ ";
      console.log(`  ${flag} ${String(r.matched).padStart(6)} matched  ${String(r.inStockMatched).padStart(6)} in stock  ${r.key}${r.error ? "  (" + r.error + ")" : ""}`);
    }
  }
  const zeros = reports.filter((r) => r.matched === 0).map((r) => r.key);
  console.log(`\nStores with 0 matches (prune or fix handles): ${zeros.length ? zeros.join(", ") : "none"}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
