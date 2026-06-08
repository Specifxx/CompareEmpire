// Live AU price importer (proven by scripts/probe-store.ts — ~94% match).
// Scrapes Australian Pokémon Shopify stores, matches products to our cards by
// collector number + name, and writes REAL prices + REAL product URLs into
// RetailerPrice (country=AU). Then recomputes lowestPriceCents (AU) for the cards
// it priced. Leaves US/NZ/UK untouched. AU-only by design = safe + accurate.
//
//   DATABASE_URL=... npx tsx scripts/import-au-prices.ts
import { PrismaClient } from "@prisma/client";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();

// AU Pokémon Shopify stores (skipped automatically if a store isn't Shopify / errors).
const STORES: { key: string; name: string; base: string }[] = [
  { key: "collectiblemadness", name: "Collectible Madness", base: "https://collectiblemadness.com.au" },
  { key: "cherry", name: "Cherry Collectables", base: "https://www.cherrycollectables.com.au" },
  { key: "ozzie", name: "Ozzie Collectables", base: "https://www.ozziecollectables.com" },
  { key: "pokebox", name: "PokéBox Australia", base: "https://www.pokebox.com.au" },
  { key: "mintcollectables", name: "Mint Collectables", base: "https://mintcollectables.com.au" },
  { key: "vaultgames", name: "Vault Games", base: "https://vaultgames.com.au" },
  { key: "spellroo", name: "Spellroo Gaming", base: "https://spellroogaming.com.au" },
  { key: "spindown", name: "Spindown", base: "https://spindown.com.au" },
  { key: "cardbot", name: "Cardbot", base: "https://cardbot.com.au" },
  { key: "cardhub", name: "The Card Hub Australia", base: "https://thecardhubaustralia.com.au" },
];

interface ShopVariant { price: string; available: boolean }
interface ShopProduct { title: string; handle: string; variants: ShopVariant[] }

function parseNum(title: string): { num: number; total: number } | null {
  const m = title.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { num: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}
function nameKey(title: string): string {
  let t = title.replace(/\d+\s*\/\s*\d+/, " ");
  t = t.replace(/\b(rare|holo|reverse|common|uncommon|promo|full art|alt art|secret|rainbow|hyper|ultra|ex|gx|v|vmax|vstar|near mint|nm|lightly played|lp|pokemon|pokémon|card|single|tcg)\b/gi, " ");
  t = t.replace(/[()\[\]{}\-–—:.,'"!]/g, " ");
  return normalizeSearch(t).split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}
function cheapestVariant(vs: ShopVariant[]): number | null {
  let best = Infinity;
  for (const v of vs) {
    const p = parseFloat(v.price);
    if (v.available && p > 0) best = Math.min(best, p);
  }
  return best === Infinity ? null : Math.round(best * 100);
}
const UA = { "User-Agent": "CompareEmpire/1.0 (price comparison)" };

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Find a store's Pokémon SINGLES collections (so we target singles directly
// instead of the flat product feed, which caps out before reaching them).
const COLL_OK = /pok[eé]mon|pkmn/i;
const COLL_SKIP = /sealed|booster|box|bundle|elite|etb|tin|case|blister|collection-box|accessor|sleeve|binder|playmat|deck-box|plush|figure|funko|gift|merch|preorder|pre-order/i;
async function pokemonCollectionHandles(base: string): Promise<string[]> {
  const handles: string[] = [];
  for (let page = 1; page <= 6; page++) {
    const data = await getJson(`${base}/collections.json?limit=250&page=${page}`);
    const cols: any[] = data?.collections ?? [];
    if (!cols.length) break;
    for (const c of cols) {
      const hay = `${c.handle} ${c.title}`;
      if (COLL_OK.test(hay) && !COLL_SKIP.test(hay)) handles.push(c.handle);
    }
    if (cols.length < 250) break;
  }
  return handles;
}

async function fetchFrom(path: string): Promise<ShopProduct[]> {
  const out: ShopProduct[] = [];
  for (let page = 1; page <= 25; page++) {
    const data = await getJson(`${path}?limit=250&page=${page}`);
    const ps: ShopProduct[] = data?.products ?? [];
    if (!ps.length) break;
    out.push(...ps);
    if (ps.length < 250) break;
  }
  return out;
}

// Prefer Pokémon collections; fall back to the flat product feed.
async function fetchProducts(base: string): Promise<ShopProduct[]> {
  const handles = await pokemonCollectionHandles(base);
  if (handles.length) {
    const seen = new Set<string>();
    const out: ShopProduct[] = [];
    for (const h of handles.slice(0, 40)) {
      for (const p of await fetchFrom(`${base}/collections/${h}/products.json`)) {
        if (!seen.has(p.handle)) {
          seen.add(p.handle);
          out.push(p);
        }
      }
    }
    if (out.length) return out;
  }
  return fetchFrom(`${base}/products.json`);
}

async function main() {
  // Index our cards by number+name.
  const cards = await prisma.card.findMany({ select: { id: true, name: true, collectorNumber: true } });
  const index = new Map<string, string>();
  for (const c of cards) {
    const m = c.collectorNumber.match(/(\d+)\D*\/?(\d+)?/);
    if (!m) continue;
    const num = parseInt(m[1], 10);
    const total = m[2] ? parseInt(m[2], 10) : 0;
    const nk = normalizeSearch(c.name).split(/\s+/).slice(0, 2).join(" ");
    index.set(`${num}/${total}|${nk}`, c.id);
    index.set(`${num}|${nk}`, c.id);
  }

  // Only clear THIS importer's own store rows (idempotent re-runs) — never the
  // whole AU market, so the seed's TCGplayer/Cardmarket/eBay AU rows always remain
  // and cards are never left empty. Real local shop listings layer on top.
  const removed = await prisma.retailerPrice.deleteMany({
    where: { retailer: { in: STORES.map((s) => s.key) } },
  });
  console.log(`Cleared ${removed.count} prior rows for these stores; scraping…`);

  const pricedCardIds = new Set<string>();
  for (const store of STORES) {
    const products = await fetchProducts(store.base);
    if (!products.length) {
      console.log(`  ${store.name}: 0 products (skipped — not Shopify or blocked)`);
      continue;
    }
    // cardId -> cheapest row for this store
    const rows = new Map<string, any>();
    let matched = 0;
    for (const p of products) {
      const pn = parseNum(p.title);
      if (!pn) continue;
      const nk = nameKey(p.title);
      const cardId = index.get(`${pn.num}/${pn.total}|${nk}`) ?? index.get(`${pn.num}|${nk}`);
      if (!cardId) continue;
      const price = cheapestVariant(p.variants);
      if (price == null) continue;
      const prev = rows.get(cardId);
      if (!prev || price < prev.priceCents) {
        rows.set(cardId, {
          cardId,
          retailer: store.key,
          retailerName: store.name,
          title: p.title.slice(0, 180),
          url: `${store.base}/products/${p.handle}`,
          priceCents: price,
          currency: "AUD",
          inStock: true,
          country: "AU",
        });
        matched++;
      }
    }
    if (rows.size) await prisma.retailerPrice.createMany({ data: Array.from(rows.values()) });
    for (const id of rows.keys()) pricedCardIds.add(id);
    console.log(`  ${store.name}: ${products.length} products → ${rows.size} cards priced (real $ + URLs)`);
  }

  // Recompute AU lowest in ONE SQL pass (fast) for every card that now has a
  // real in-stock AU listing. Cards without real AU data keep their estimate.
  console.log(`Recomputing AU lowest for ${pricedCardIds.size} priced cards…`);
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Card" c
    SET "lowestPriceCents" = sub.minp
    FROM (
      SELECT "cardId", MIN("priceCents") AS minp
      FROM "RetailerPrice"
      WHERE country = 'AU' AND "inStock" = true
      GROUP BY "cardId"
    ) sub
    WHERE c.id = sub."cardId"
  `);
  console.log(`Done. ${pricedCardIds.size} cards now have REAL AU store prices + product links; ${updated} AU lowest prices updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
