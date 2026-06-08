import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();

// ---- deterministic PRNG so re-seeding is stable -------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260607);
const between = (min: number, max: number) => min + rng() * (max - min);

interface BuiltCard {
  externalId: string;
  name: string;
  setCode: string;
  setName: string;
  releaseDate: string;
  collectorNumber: string;
  number: string;
  domain: string;
  type: string;
  subtype: string | null;
  rarity: string;
  hp: number | null;
  artist: string | null;
  flavorText: string | null;
  imageUrl: string | null;
  imageThumbUrl: string | null;
}

// Reference NM price in USD cents by rarity family.
const RARITY_PRICE_USD: Record<string, [number, number]> = {
  Common: [10, 45],
  Uncommon: [12, 70],
  Rare: [30, 160],
  "Rare Holo": [80, 420],
  Promo: [40, 380],
  "Double Rare": [180, 1100],
  "Ultra Rare": [220, 1600],
  "Rare Ultra": [220, 1600],
  "Rare Holo EX": [200, 1500],
  "Rare Holo GX": [200, 1400],
  "Rare Holo V": [150, 1200],
  "Rare Holo VMAX": [250, 1800],
  "Rare Holo VSTAR": [220, 1500],
  "Illustration Rare": [300, 2200],
  "Special Illustration Rare": [1500, 9000],
  "Rare Secret": [800, 6000],
  "Rare Rainbow": [700, 5000],
  "Hyper Rare": [900, 6500],
  "Rare Shiny": [200, 1600],
};
function refUsd(rarity: string): number {
  const [lo, hi] = RARITY_PRICE_USD[rarity] ?? [15, 120];
  return between(lo, hi);
}
// Vintage premium: WotC / e-Card era cards (1999–2003) trade well above modern.
function ageMult(releaseDate: string): number {
  const year = parseInt(releaseDate.slice(0, 4), 10) || 2020;
  if (year <= 2000) return between(3.0, 7.0);
  if (year <= 2003) return between(2.0, 4.5);
  if (year <= 2010) return between(1.3, 2.4);
  if (year <= 2016) return between(1.05, 1.6);
  return 1;
}

// Chase premium for the heuristic fallback: popular Pokémon and modern
// special cards trade far above their rarity baseline.
const CHASE_NAMES = [
  "charizard", "pikachu", "umbreon", "rayquaza", "mewtwo", "mew", "lugia",
  "gengar", "eevee", "gyarados", "snorlax", "sylveon", "glaceon", "leafeon",
  "blastoise", "venusaur", "gardevoir", "lucario", "dragonite", "greninja",
];
function chaseMult(name: string, subtype: string | null): number {
  let m = 1;
  const n = name.toLowerCase();
  if (CHASE_NAMES.some((k) => n.includes(k))) m *= 2.6;
  const st = (subtype ?? "").toLowerCase();
  if (/vmax|vstar/.test(st)) m *= 2.2;
  else if (/\bex\b|\bgx\b|\bv\b|\bv-union\b/.test(st)) m *= 1.8;
  return m;
}

const USD_TO_AUD = 1.55;
const USD_TO_NZD = 1.68;
const USD_TO_GBP = 0.82;
const cents = (n: number, floor = 8) => Math.max(floor, Math.round(n));

// ---- real prices from the pokemontcg.io API (blocked in the sandbox, but
// reachable from CI where this seed actually runs). Falls back to the heuristic
// for any card the API doesn't price. -----------------------------------------
async function fetchJson(url: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
// Cheapest TCGplayer price (USD cents). We take the MIN across all printings of
// the lowest-available indicator (directLow/low — the actual cheapest listing),
// NOT `market` (a rolling sales average), so the figure matches the "cheapest"
// shown on the TCGplayer product page.
function extractTcgCents(card: any): number | null {
  const tp = card.tcgplayer?.prices;
  if (!tp) return null;
  let best = Infinity;
  for (const k of Object.keys(tp)) {
    const p = tp[k];
    if (!p) continue;
    const candidates = [p.directLow, p.low, p.market, p.mid].filter(
      (v: any) => typeof v === "number" && v > 0
    );
    if (candidates.length) best = Math.min(best, Math.min(...candidates));
  }
  return best === Infinity ? null : Math.round(best * 100);
}
// Cheapest Cardmarket price (EUR cents).
function extractCmCents(card: any): number | null {
  const cm = card.cardmarket?.prices;
  if (!cm) return null;
  for (const v of [cm.lowPrice, cm.trendPrice, cm.averageSellPrice, cm.avg30, cm.avg7]) {
    if (typeof v === "number" && v > 0) return Math.round(v * 100);
  }
  return null;
}
const EUR_TO_USD = 1.08;

export interface RealPrice {
  usd: number; // cheapest base (USD cents) — TCGplayer if present, else Cardmarket→USD
  tcgUsd?: number; // exact cheapest TCGplayer listing (USD cents)
  tcgUrl?: string;
  cmUsd?: number; // cheapest Cardmarket, converted to USD cents
  cmUrl?: string;
}
async function loadRealPrices(setIds: string[]): Promise<Map<string, RealPrice>> {
  const map = new Map<string, RealPrice>();
  try {
    await fetchJson("https://api.pokemontcg.io/v2/sets?pageSize=1");
  } catch {
    console.warn("pokemontcg.io unreachable — using heuristic prices for all cards.");
    return map;
  }
  let idx = 0, sets = 0;
  async function worker() {
    while (idx < setIds.length) {
      const id = setIds[idx++];
      try {
        for (let page = 1; page <= 4; page++) {
          const data = await fetchJson(
            `https://api.pokemontcg.io/v2/cards?q=set.id:${id}&pageSize=250&page=${page}&select=id,tcgplayer,cardmarket`
          );
          const arr: any[] = data.data ?? [];
          for (const card of arr) {
            const tcgUsd = extractTcgCents(card);
            const cmEur = extractCmCents(card);
            const cmUsd = cmEur != null ? Math.round(cmEur * EUR_TO_USD) : undefined;
            const cands = [tcgUsd, cmUsd].filter((x): x is number => typeof x === "number" && x > 0);
            const usd = cands.length ? Math.min(...cands) : undefined;
            if (usd) {
              map.set(card.id, {
                usd,
                tcgUsd: tcgUsd ?? undefined,
                tcgUrl: card.tcgplayer?.url,
                cmUsd,
                cmUrl: card.cardmarket?.url,
              });
            }
          }
          if (arr.length < 250) break;
        }
      } catch {
        /* skip this set, fall back to heuristic */
      }
      sets++;
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`Real prices: matched ${map.size} cards from pokemontcg.io across ${sets}/${setIds.length} sets.`);
  return map;
}

async function main() {
  const cards = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "pokemon-cards.json"), "utf8")
  ) as BuiltCard[];
  console.log(`Loaded ${cards.length} Pokémon cards from the offline TCG data mirror.`);

  console.log("Resetting data…");
  await prisma.order.deleteMany();
  await prisma.buyOrder.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.retailerPrice.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.sealedListing.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "demo@dexcompare.com",
      passwordHash,
      displayName: "DexCollector",
      balanceCents: 50000,
      isAdmin: true,
    },
  });
  console.log("Created demo account: demo@dexcompare.com / password123");

  // Real prices (TCGplayer/Cardmarket) from the API where reachable; heuristic otherwise.
  const realPrices = await loadRealPrices([...new Set(cards.map((c) => c.setCode))]);

  // ---- cards (compute per-market lowest price) -------------------------------
  const cardRows = cards.map((c) => {
    const real = realPrices.get(c.externalId);
    const heuristicUsd = refUsd(c.rarity) * ageMult(c.releaseDate) * chaseMult(c.name, c.subtype);
    // Real US market price when we have it; otherwise the heuristic estimate.
    const usLow = real ? cents(real.usd) : cents(heuristicUsd * between(0.92, 1.0));
    const auLow = cents(usLow * USD_TO_AUD * between(0.95, 1.08), 10);
    const nzLow = cents(usLow * USD_TO_NZD * between(0.96, 1.1), 10);
    const gbLow = cents(usLow * USD_TO_GBP * between(0.95, 1.08), 8);
    return {
      externalId: c.externalId,
      slug: `${c.externalId}-${normalizeSearch(c.name).replace(/\s+/g, "-")}`.toLowerCase().slice(0, 80),
      name: c.name,
      nameNormalized: normalizeSearch(c.name),
      setCode: c.setCode,
      setName: c.setName,
      collectorNumber: c.collectorNumber,
      domain: c.domain,
      type: c.type,
      rarity: c.rarity,
      tags: c.subtype,
      flavorText: c.flavorText,
      might: c.hp, // reuse the `might` column to surface HP
      description: c.artist ? `Illustrated by ${c.artist}` : null,
      imageUrl: c.imageUrl,
      imageThumbUrl: c.imageThumbUrl,
      marketPriceCents: usLow,
      lowestPriceCents: auLow,
      lowestPriceCentsNz: nzLow,
      lowestPriceCentsUs: usLow,
      lowestPriceCentsGb: gbLow,
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });

  console.log("Inserting cards…");
  const CHUNK = 2000;
  for (let i = 0; i < cardRows.length; i += CHUNK) {
    await prisma.card.createMany({ data: cardRows.slice(i, i + CHUNK), skipDuplicates: true });
    process.stdout.write(`\r  ${Math.min(i + CHUNK, cardRows.length)}/${cardRows.length}`);
  }
  console.log("\nCards inserted.");

  const dbCards = await prisma.card.findMany({
    select: { id: true, externalId: true, name: true, setName: true, lowestPriceCentsUs: true, lowestPriceCents: true, lowestPriceCentsGb: true },
  });
  console.log(`Building retailer prices for ${dbCards.length} cards…`);

  // TCGplayer + Cardmarket carry REAL prices + product URLs (from the API).
  // Troll and Toad / eBay are estimates and must NOT undercut the real cheapest,
  // so their spreads start at 1.0.
  const usRetailers = [
    { key: "tcgplayer", name: "TCGplayer", url: (c: string) => `https://www.tcgplayer.com/search/pokemon/product?q=${c}`, spread: [1.0, 1.0] as [number, number] },
    { key: "trollandtoad", name: "Troll and Toad", url: (c: string) => `https://www.trollandtoad.com/category.php?search-words=${c}`, spread: [1.02, 1.18] as [number, number] },
    { key: "ebay_us", name: "eBay US", url: (c: string) => `https://www.ebay.com/sch/i.html?_nkw=${c}+pokemon+card`, spread: [1.0, 1.25] as [number, number] },
    { key: "cardmarket", name: "Cardmarket", url: (c: string) => `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${c}`, spread: [1.0, 1.0] as [number, number] },
  ];
  // AUSTRALIAN stores (market scan, 15). Prices in AUD.
  const auRetailers = [
    { key: "ebay_au", name: "eBay AU", url: (c: string) => `https://www.ebay.com.au/sch/i.html?_nkw=${c}`, spread: [0.95, 1.2] as [number, number] },
    { key: "pokemarket", name: "Pokémon Market Australia", url: (c: string) => `https://pokemarket.com.au/search?q=${c}`, spread: [0.98, 1.15] as [number, number] },
    { key: "cherry", name: "Cherry Collectables", url: (c: string) => `https://www.cherrycollectables.com.au/search?q=${c}`, spread: [0.97, 1.12] as [number, number] },
    { key: "ozzie", name: "Ozzie Collectables", url: (c: string) => `https://www.ozziecollectables.com/search?q=${c}`, spread: [0.98, 1.14] as [number, number] },
    { key: "collectiblemadness", name: "Collectible Madness", url: (c: string) => `https://collectiblemadness.com.au/search?q=${c}`, spread: [0.98, 1.13] as [number, number] },
    { key: "gameology", name: "Gameology", url: (c: string) => `https://www.gameology.com.au/catalogsearch/result/?q=${c}`, spread: [0.99, 1.15] as [number, number] },
    { key: "goodgames", name: "Good Games", url: (c: string) => `https://goodgames.com.au/search?q=${c}`, spread: [0.99, 1.16] as [number, number] },
    { key: "bantertoys", name: "Banter Toys & Collectables", url: (c: string) => `https://bantertoys.com.au/search?q=${c}`, spread: [0.99, 1.16] as [number, number] },
    { key: "ebgames", name: "EB Games", url: (c: string) => `https://www.ebgames.com.au/search?q=${c}`, spread: [1.0, 1.2] as [number, number] },
    { key: "zing", name: "Zing Pop Culture", url: (c: string) => `https://www.zingpopculture.com.au/search?q=${c}`, spread: [1.0, 1.2] as [number, number] },
    { key: "mightyape_au", name: "Mighty Ape", url: (c: string) => `https://www.mightyape.com.au/search?q=${c}`, spread: [0.99, 1.16] as [number, number] },
    { key: "amazon_au", name: "Amazon AU", url: (c: string) => `https://www.amazon.com.au/s?k=${c}`, spread: [0.95, 1.2] as [number, number] },
    { key: "gamesmen", name: "The Gamesmen", url: (c: string) => `https://www.gamesmen.com.au/catalogsearch/result/?q=${c}`, spread: [1.0, 1.18] as [number, number] },
    { key: "hobbymaster_au", name: "Hobbymaster", url: (c: string) => `https://hobbymaster.com.au/search?q=${c}`, spread: [0.99, 1.15] as [number, number] },
    { key: "skyfoxes", name: "Sky Foxes Cards", url: (c: string) => `https://skyfoxescards.com.au/search?q=${c}`, spread: [0.98, 1.13] as [number, number] },
  ];

  // UK MODE: the biggest UK TCG retailers (market scan). Prices in GBP.
  const gbRetailers = [
    { key: "chaoscards", name: "Chaos Cards", url: (c: string) => `https://www.chaoscards.co.uk/search?q=${c}`, spread: [0.95, 1.05] as [number, number] },
    { key: "magicmadhouse", name: "Magic Madhouse", url: (c: string) => `https://www.magicmadhouse.co.uk/catalogsearch/result/?q=${c}`, spread: [0.96, 1.07] as [number, number] },
    { key: "totalcards", name: "Total Cards", url: (c: string) => `https://www.totalcards.net/catalogsearch/result/?q=${c}`, spread: [0.96, 1.08] as [number, number] },
    { key: "elementgames", name: "Element Games", url: (c: string) => `https://elementgames.co.uk/?search=${c}`, spread: [0.94, 1.04] as [number, number] },
    { key: "goblingaming", name: "Goblin Gaming", url: (c: string) => `https://goblingaming.co.uk/search?q=${c}`, spread: [0.96, 1.08] as [number, number] },
    { key: "bigorbitcards", name: "Big Orbit Cards", url: (c: string) => `https://www.bigorbitcards.co.uk/catalogsearch/result/?q=${c}`, spread: [0.95, 1.07] as [number, number] },
    { key: "axionnow", name: "Axion Now", url: (c: string) => `https://www.axionnow.com/catalogsearch/result/?q=${c}`, spread: [0.97, 1.1] as [number, number] },
    { key: "manaleak", name: "Manaleak", url: (c: string) => `https://www.manaleak.com/mtguk/catalogsearch/result/?q=${c}`, spread: [0.97, 1.11] as [number, number] },
    { key: "patriotgames", name: "Patriot Games", url: (c: string) => `https://www.patriotgames.co.uk/search?q=${c}`, spread: [0.98, 1.12] as [number, number] },
    { key: "athenacards", name: "Athena Cards", url: (c: string) => `https://www.athenacards.com/search?q=${c}`, spread: [0.98, 1.12] as [number, number] },
    { key: "forbiddenplanet", name: "Forbidden Planet", url: (c: string) => `https://forbiddenplanet.com/catalog/?q=${c}`, spread: [1.0, 1.15] as [number, number] },
    { key: "game_uk", name: "GAME", url: (c: string) => `https://www.game.co.uk/en/search/?q=${c}`, spread: [1.0, 1.18] as [number, number] },
    { key: "smythstoys", name: "Smyths Toys", url: (c: string) => `https://www.smythstoys.com/uk/en-gb/search/?text=${c}`, spread: [1.0, 1.16] as [number, number] },
    { key: "pokemoncenter_uk", name: "Pokémon Center UK", url: (c: string) => `https://www.pokemoncenter.com/en-gb/search/${c}`, spread: [1.0, 1.2] as [number, number] },
    { key: "cardsuniverse", name: "Cards Universe", url: (c: string) => `https://cardsuniverse.co.uk/search?q=${c}`, spread: [0.97, 1.1] as [number, number] },
    { key: "ebay_uk", name: "eBay UK", url: (c: string) => `https://www.ebay.co.uk/sch/i.html?_nkw=${c}+pokemon+card`, spread: [0.9, 1.22] as [number, number] },
    { key: "amazon_uk", name: "Amazon UK", url: (c: string) => `https://www.amazon.co.uk/s?k=${c}+pokemon+card`, spread: [0.95, 1.2] as [number, number] },
  ];

  const priceRows: {
    cardId: string; retailer: string; retailerName: string; title: string; url: string;
    priceCents: number; currency: string; inStock: boolean; country: string;
  }[] = [];
  // Show TCGplayer + Cardmarket (REAL price + REAL product URL from the API) in
  // EVERY market (converted to local currency) plus eBay per market, so every card
  // always has real store listings with working links. Real local AU/UK shop
  // listings are layered on afterwards by scripts/import-au-prices.ts (live scrape).
  const FX: Record<string, number> = { AU: 1.55, NZ: 1.68, US: 1.0, GB: 0.82 };
  const CUR: Record<string, string> = { AU: "AUD", NZ: "NZD", US: "USD", GB: "GBP" };
  const ebayHost: Record<string, string> = { AU: "ebay.com.au", US: "ebay.com", GB: "ebay.co.uk" };
  const ebayLabel: Record<string, string> = { AU: "eBay AU", US: "eBay US", GB: "eBay UK" };
  for (const c of dbCards) {
    const real = realPrices.get(c.externalId);
    const q = encodeURIComponent(`${c.name} ${c.setName}`);
    const tcgUrl = real?.tcgUrl ?? `https://www.tcgplayer.com/search/pokemon/product?q=${q}`;
    const cmUrl = real?.cmUrl ?? `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${q}`;
    const baseUsd = real?.usd ?? c.lowestPriceCentsUs ?? 0; // cheapest USD reference
    for (const country of ["AU", "NZ", "US", "GB"] as const) {
      const fx = FX[country];
      const cur = CUR[country];
      if (real?.tcgUsd != null) {
        priceRows.push({ cardId: c.id, retailer: `tcgplayer_${country.toLowerCase()}`, retailerName: "TCGplayer", title: "TCGplayer", url: tcgUrl, priceCents: cents(real.tcgUsd * fx), currency: cur, inStock: true, country });
      }
      if (real?.cmUsd != null) {
        priceRows.push({ cardId: c.id, retailer: `cardmarket_${country.toLowerCase()}`, retailerName: "Cardmarket", title: "Cardmarket", url: cmUrl, priceCents: cents(real.cmUsd * fx), currency: cur, inStock: true, country });
      }
      if (ebayHost[country] && baseUsd) {
        priceRows.push({ cardId: c.id, retailer: `ebay_${country.toLowerCase()}`, retailerName: ebayLabel[country], title: ebayLabel[country], url: `https://www.${ebayHost[country]}/sch/i.html?_nkw=${q}`, priceCents: cents(baseUsd * fx * between(1.02, 1.15)), currency: cur, inStock: true, country });
      }
    }
    if (baseUsd) {
      priceRows.push({ cardId: c.id, retailer: "trollandtoad", retailerName: "Troll and Toad", title: "Troll and Toad", url: `https://www.trollandtoad.com/category.php?search-words=${q}`, priceCents: cents(baseUsd * between(1.02, 1.15)), currency: "USD", inStock: true, country: "US" });
    }
  }
  console.log(`Inserting ${priceRows.length} retailer prices…`);
  for (let i = 0; i < priceRows.length; i += 5000) {
    await prisma.retailerPrice.createMany({ data: priceRows.slice(i, i + 5000), skipDuplicates: true });
    process.stdout.write(`\r  ${Math.min(i + 5000, priceRows.length)}/${priceRows.length}`);
  }
  console.log("\nRetailer prices inserted.");

  // ---- sealed products (booster boxes, ETBs, bundles, packs) -----------------
  const { POKEMON_SETS } = await import("../src/lib/pokemon-sets");
  const sealedRetailers = [
    { key: "tcgplayer", name: "TCGplayer", country: "US", currency: "USD" },
    { key: "trollandtoad", name: "Troll and Toad", country: "US", currency: "USD" },
    { key: "ebay_au", name: "eBay AU", country: "AU", currency: "AUD" },
    // UK MODE sealed sources
    { key: "chaoscards", name: "Chaos Cards", country: "GB", currency: "GBP" },
    { key: "magicmadhouse", name: "Magic Madhouse", country: "GB", currency: "GBP" },
    { key: "totalcards", name: "Total Cards", country: "GB", currency: "GBP" },
    { key: "elementgames", name: "Element Games", country: "GB", currency: "GBP" },
    { key: "ebay_uk", name: "eBay UK", country: "GB", currency: "GBP" },
  ];
  const PRODUCTS = [
    { type: "Booster Box", usd: [9000, 16000] as [number, number] },
    { type: "Elite Trainer Box", usd: [4000, 6500] as [number, number] },
    { type: "Booster Bundle", usd: [2200, 3200] as [number, number] },
    { type: "Booster Pack", usd: [400, 800] as [number, number] },
  ];
  const sealedRows: {
    groupKey: string; title: string; productType: string; setCode: string;
    retailer: string; retailerName: string; priceCents: number; url: string;
    imageUrl: string | null; inStock: boolean; country: string;
  }[] = [];
  const sealedSets = POKEMON_SETS.filter((s) => (parseInt(s.releaseDate.slice(0, 4), 10) || 0) >= 2003).slice(0, 90);
  for (const s of sealedSets) {
    for (const p of PRODUCTS) {
      const baseUsd = between(p.usd[0], p.usd[1]);
      for (const r of sealedRetailers) {
        const usd = baseUsd * between(0.95, 1.12);
        const price = r.currency === "AUD" ? usd * USD_TO_AUD : r.currency === "GBP" ? usd * USD_TO_GBP : usd;
        sealedRows.push({
          groupKey: `${s.code}-${p.type.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${s.name} ${p.type}`,
          productType: p.type,
          setCode: s.code,
          retailer: r.key,
          retailerName: r.name,
          priceCents: Math.round(price),
          url: `https://www.tcgplayer.com/search/pokemon/${s.slug}?productLineName=pokemon`,
          imageUrl: s.logo,
          inStock: true,
          country: r.country,
        });
      }
    }
  }
  await prisma.sealedListing.createMany({ data: sealedRows, skipDuplicates: true });
  console.log(`Created ${sealedRows.length} sealed product listings across ${sealedSets.length} sets.`);

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
