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
async function fetchProducts(base: string): Promise<ShopProduct[]> {
  const out: ShopProduct[] = [];
  for (let page = 1; page <= 40; page++) {
    try {
      const res = await fetch(`${base}/products.json?limit=250&page=${page}`, {
        headers: { "User-Agent": "CompareEmpire/1.0 (price comparison)" },
      });
      if (!res.ok) break;
      const data = (await res.json()) as { products?: ShopProduct[] };
      if (!data.products?.length) break;
      out.push(...data.products);
      if (data.products.length < 250) break;
    } catch {
      break;
    }
  }
  return out;
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

  // Clear ALL existing AU rows (synthetic estimates from the seed) so the AU
  // market becomes 100% real store data.
  const removed = await prisma.retailerPrice.deleteMany({ where: { country: "AU" } });
  console.log(`Cleared ${removed.count} synthetic AU rows; scraping real stores…`);

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

  // Recompute AU lowest for cards we actually priced (leave others on their estimate).
  console.log(`Recomputing AU lowest for ${pricedCardIds.size} priced cards…`);
  const grouped = await prisma.retailerPrice.groupBy({
    by: ["cardId"],
    where: { country: "AU", inStock: true, cardId: { in: Array.from(pricedCardIds) } },
    _min: { priceCents: true },
  });
  let updated = 0;
  for (const g of grouped) {
    if (g._min.priceCents != null) {
      await prisma.card.update({ where: { id: g.cardId }, data: { lowestPriceCents: g._min.priceCents } });
      updated++;
    }
  }
  console.log(`Done. ${pricedCardIds.size} cards now have REAL AU store prices + product links; ${updated} AU lowest prices updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
