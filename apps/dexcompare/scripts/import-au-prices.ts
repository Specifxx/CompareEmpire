// Live AU price importer. Scrapes Australian Pokémon Shopify stores, matches
// products to our cards by collector number + name (with a set-name fallback for
// stores whose titles omit the number), and writes REAL prices + REAL product URLs
// into RetailerPrice (country=AU). Then recomputes lowestPriceCents (AU) for the
// cards it priced. Leaves US/NZ/UK untouched. AU-only by design = safe + accurate.
//
//   DATABASE_URL=... npx tsx scripts/import-au-prices.ts
import { PrismaClient } from "@prisma/client";

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
  // Added stores (auto-skipped if not Shopify).
  { key: "chimera", name: "Chimera Gaming", base: "https://chimeragaming.com.au" },
  { key: "gamescapital", name: "The Games Capital", base: "https://www.thegamescapital.com.au" },
  { key: "gameology", name: "Gameology", base: "https://www.gameology.com.au" },
  { key: "bantertoys", name: "Banter Toys", base: "https://bantertoys.com.au" },
  { key: "goodgames", name: "Good Games", base: "https://goodgames.com.au" },
  { key: "kingofcards", name: "King of Cards", base: "https://kingofcards.com.au" },
  { key: "tcgmarketplace", name: "TCG Marketplace", base: "https://tcgmarketplace.com.au" },
];

interface ShopVariant { price: string; available: boolean }
interface ShopProduct { title: string; handle: string; variants: ShopVariant[] }

// --- text helpers (word-based; do NOT collapse spaces) ----------------------
const STOP = new Set([
  "pokemon", "pokémon", "card", "cards", "single", "singles", "tcg", "the", "a", "an",
  "nm", "near", "mint", "lightly", "played", "lp", "mp", "hp", "dmg", "damaged",
  "holo", "reverse", "foil", "non", "rare", "common", "uncommon", "promo", "full",
  "alt", "alternate", "art", "secret", "rainbow", "hyper", "ultra", "english",
  "japanese", "jpn", "eng", "graded", "psa", "bgs", "cgc", "set", "edition", "1st",
  "first", "unlimited", "trainer", "energy", "scarlet", "violet", "sword", "shield",
]);
function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}
function nameTokens(s: string): string[] {
  return words(s).filter((w) => !STOP.has(w) && w.length > 1);
}

function parseNum(title: string): { num: number; total: number } | null {
  const m = title.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  return { num: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}
function cardDigits(cn: string): { num: number; total: number } | null {
  const m = cn.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) return { num: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  const m2 = cn.match(/(\d+)/);
  return m2 ? { num: parseInt(m2[1], 10), total: 0 } : null;
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

interface IdxCard { id: string; nameToks: string[]; setToks: string[]; num: number; total: number }

async function main() {
  const cards = await prisma.card.findMany({
    select: { id: true, name: true, setName: true, collectorNumber: true },
  });

  // Build indexes:
  //   byKey  "num/total" -> cards   (most precise)
  //   byNum  num         -> cards   (titles with just a number)
  //   byName primaryTok  -> cards   (no-number titles; disambiguated by set name)
  const byKey = new Map<string, IdxCard[]>();
  const byNum = new Map<number, IdxCard[]>();
  const byName = new Map<string, IdxCard[]>();
  const push = (m: Map<any, IdxCard[]>, k: any, c: IdxCard) => {
    const arr = m.get(k);
    if (arr) arr.push(c); else m.set(k, [c]);
  };
  for (const c of cards) {
    const d = cardDigits(c.collectorNumber);
    const nameToks = nameTokens(c.name);
    if (!nameToks.length) continue;
    const ic: IdxCard = {
      id: c.id, nameToks, setToks: nameTokens(c.setName || ""),
      num: d?.num ?? -1, total: d?.total ?? 0,
    };
    if (d) {
      if (d.total) push(byKey, `${d.num}/${d.total}`, ic);
      push(byNum, d.num, ic);
    }
    push(byName, nameToks[0], ic);
  }

  // Only clear THIS importer's own store rows (idempotent re-runs) — never the
  // whole AU market, so cards are never left empty if a store goes offline.
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
    const rows = new Map<string, any>(); // cardId -> cheapest row for this store
    let byKeyHits = 0, byNameHits = 0;
    for (const p of products) {
      const ptoks = nameTokens(p.title);
      if (!ptoks.length) continue;
      const ptokset = new Set(ptoks);
      const nameOk = (c: IdxCard) => ptokset.has(c.nameToks[0]);
      const fullNameOk = (c: IdxCard) => c.nameToks.every((t) => ptokset.has(t));

      let match: IdxCard | undefined;
      const pn = parseNum(p.title);
      if (pn) {
        // 1) exact num/total + name present
        const k = byKey.get(`${pn.num}/${pn.total}`);
        if (k) match = k.find(nameOk) ?? (k.length === 1 ? k[0] : undefined);
        // 2) same number, name present
        if (!match) {
          const n = byNum.get(pn.num);
          if (n) match = n.find(fullNameOk) ?? n.find(nameOk);
        }
        if (match) byKeyHits++;
      }
      if (!match) {
        // 3) no usable number on the listing: match by name + full set name.
        for (const tok of ptoks) {
          const cands = byName.get(tok);
          if (!cands) continue;
          const m = cands.find(
            (c) => c.setToks.length > 0 && c.setToks.every((s) => ptokset.has(s)) && fullNameOk(c),
          );
          if (m) { match = m; byNameHits++; break; }
        }
      }
      if (!match) continue;

      const price = cheapestVariant(p.variants);
      if (price == null) continue;
      const prev = rows.get(match.id);
      if (!prev || price < prev.priceCents) {
        rows.set(match.id, {
          cardId: match.id,
          retailer: store.key,
          retailerName: store.name,
          title: p.title.slice(0, 180),
          url: `${store.base}/products/${p.handle}`,
          priceCents: price,
          currency: "AUD",
          inStock: true,
          country: "AU",
        });
      }
    }
    if (rows.size) await prisma.retailerPrice.createMany({ data: Array.from(rows.values()) });
    for (const id of rows.keys()) pricedCardIds.add(id);
    console.log(
      `  ${store.name}: ${products.length} products → ${rows.size} cards priced ` +
      `(num:${byKeyHits} set:${byNameHits})`,
    );
  }

  // Recompute AU lowest in ONE SQL pass for every card that now has a real
  // in-stock AU listing. Cards without real AU data keep their prior value.
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
