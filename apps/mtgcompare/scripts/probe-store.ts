// READ-ONLY probe: scrape one AU Shopify store (Collectible Madness) and report
// how many products we can match to our cards, with the real price + product URL.
// Proves the live-scraper approach (real AU prices + links) before we wire it into
// the seed. No database writes. Runs in CI (needs DATABASE_URL + open network).
//
//   DATABASE_URL=... npx tsx scripts/probe-store.ts
import { PrismaClient } from "@prisma/client";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();
const BASE = "https://collectiblemadness.com.au";

interface ShopVariant { price: string; available: boolean }
interface ShopProduct { title: string; handle: string; product_type?: string; variants: ShopVariant[] }

function parseNum(title: string): { num: number; total: number } | null {
  const m = title.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { num: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}
// Card name from a title like "011/193 Abomasnow (Rare Holo)" or
// "Abomasnow 011/193 - Rare Holo".
function nameKey(title: string): string {
  let t = title.replace(/\d+\s*\/\s*\d+/, " ");
  t = t.replace(/\b(rare|holo|reverse|common|uncommon|promo|full art|alt art|secret|rainbow|hyper|ultra|ex|gx|v|vmax|vstar|near mint|nm|lightly played|lp|pokemon|pokémon|card|single|tcg)\b/gi, " ");
  t = t.replace(/[()\[\]{}\-–—:.,'"!]/g, " ");
  return normalizeSearch(t).split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

async function fetchProducts(): Promise<ShopProduct[]> {
  const out: ShopProduct[] = [];
  for (let page = 1; page <= 25; page++) {
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, { headers: { "User-Agent": "CompareEmpire-probe/1.0" } });
    if (!res.ok) break;
    const data = (await res.json()) as { products: ShopProduct[] };
    if (!data.products?.length) break;
    out.push(...data.products);
    if (data.products.length < 250) break;
  }
  return out;
}

async function main() {
  console.log(`Fetching ${BASE}/products.json …`);
  const products = await fetchProducts();
  console.log(`Fetched ${products.length} products.`);

  // Build a lookup of our cards by "<num>/<total>" + first-2-words of name.
  const cards = await prisma.card.findMany({ select: { name: true, collectorNumber: true } });
  const index = new Map<string, string>();
  for (const c of cards) {
    const m = c.collectorNumber.match(/(\d+)\D*\/?(\d+)?/);
    if (!m) continue;
    const num = parseInt(m[1], 10);
    const total = m[2] ? parseInt(m[2], 10) : 0;
    const nk = normalizeSearch(c.name).split(/\s+/).slice(0, 2).join(" ");
    index.set(`${num}/${total}|${nk}`, c.name);
    index.set(`${num}|${nk}`, c.name); // looser fallback (number only + name)
  }

  let withNum = 0, matched = 0;
  const samples: string[] = [];
  for (const p of products) {
    const pn = parseNum(p.title);
    if (!pn) continue;
    withNum++;
    const nk = nameKey(p.title);
    const hit = index.get(`${pn.num}/${pn.total}|${nk}`) ?? index.get(`${pn.num}|${nk}`);
    if (hit) {
      matched++;
      if (samples.length < 8) {
        const v = p.variants.find((x) => parseFloat(x.price) > 0);
        samples.push(`  ✓ "${p.title}"  →  ${hit}  @ A$${v?.price ?? "?"}  ${BASE}/products/${p.handle}`);
      }
    }
  }
  console.log(`\nProducts with a card number: ${withNum}`);
  console.log(`Matched to our cards: ${matched} (${withNum ? Math.round((matched / withNum) * 100) : 0}%)`);
  console.log("Samples:\n" + samples.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
