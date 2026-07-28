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
// Representative market value (USD cents) from TCGplayer. We use `market` (the
// rolling sales average ≈ a Near-Mint going rate), NOT directLow/low (the cheapest,
// often damaged, listing) — using the floor made vintage holos read absurdly low
// (a Base Set Charizard showed its cheapest played copy, not its real value). Across
// finishes we take the MOST VALUABLE printing's market (holofoil / 1st-edition),
// since that's the price collectors mean for a chase card.
function extractTcgCents(card: any): number | null {
  const tp = card.tcgplayer?.prices;
  if (!tp) return null;
  let best = 0;
  for (const k of Object.keys(tp)) {
    const p = tp[k];
    if (!p) continue;
    const v = [p.market, p.mid, p.high, p.low, p.directLow].find(
      (x: any) => typeof x === "number" && x > 0
    );
    if (typeof v === "number" && v > best) best = v;
  }
  return best > 0 ? Math.round(best * 100) : null;
}
// Representative Cardmarket price (EUR cents): trend/average over the cheapest floor.
function extractCmCents(card: any): number | null {
  const cm = card.cardmarket?.prices;
  if (!cm) return null;
  for (const v of [cm.trendPrice, cm.averageSellPrice, cm.avg7, cm.avg30, cm.lowPrice]) {
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
  // TRUNCATE (not DELETE) frees space immediately — important if a prior run bloated
  // the table near the storage cap.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RetailerPrice"');
  await prisma.deal.deleteMany();
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

  // Marketplace admin / verified seller — re-created on every seed so the user wipe
  // above never drops it. Password stored as a bcrypt hash only (override via
  // ADMIN_PASSWORD_HASH); plaintext is never committed.
  const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$10$O5fONAak2jY/zGCVkbhp/.sIxGuqmGfYU0DxNgOpf8sTC64qQFxum";
  await prisma.user.upsert({
    where: { email: "compareempire" },
    update: { passwordHash: ADMIN_HASH, isAdmin: true, verifiedSeller: true, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", emailVerified: new Date() },
    create: { email: "compareempire", passwordHash: ADMIN_HASH, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", isAdmin: true, verifiedSeller: true, emailVerified: new Date() },
  });
  console.log("Ensured compareempire admin / verified seller.");

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
      // Surface WHERE the guide number came from. Real API price = TCGplayer's
      // market price (via pokemontcg.io); otherwise our rarity/age heuristic.
      marketPriceSource: real ? "TCGplayer" : "Estimate",
      marketPriceUpdatedAt: new Date(),
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

  const priceRows: {
    cardId: string; retailer: string; retailerName: string; title: string; url: string;
    priceCents: number; currency: string; inStock: boolean; country: string;
  }[] = [];
  // TCGplayer + Cardmarket carry a REAL price + REAL product URL from the API. They
  // provide catalogue-wide baseline coverage per market so cards no local store stocks
  // still show an indicative price (clearly labelled "TCGplayer"/"Cardmarket", linking
  // to the real product). Live local store prices (scraped by the importer) are usually
  // cheaper and win the per-market lowest-price recompute. AU previously had NO baseline
  // (local stores only), which left ~half the catalogue with "no price" in AU — so AU
  // now gets the TCGplayer baseline too (international-shipping option), like NZ.
  const FX: Record<string, number> = { AU: 1.55, NZ: 1.68, US: 1.0, GB: 0.82 };
  const CUR: Record<string, string> = { AU: "AUD", NZ: "NZD", US: "USD", GB: "GBP" };
  // Baseline source identity per market. US/NZ use TCGplayer (it ships there as an
  // international option). AU does NOT — TCGplayer doesn't sensibly ship singles to
  // Australia — so AU shows a clearly-labelled MARKET GUIDE (an estimate, not a
  // purchasable store): no outbound buy link, and real local AU stores are the
  // actual buyable prices that rank above it.
  const BASE: Record<string, { retailer: string; name: string; store: boolean }> = {
    US: { retailer: "tcgplayer_us", name: "TCGplayer", store: true },
    NZ: { retailer: "tcgplayer_nz", name: "TCGplayer", store: true },
    AU: { retailer: "marketguide_au", name: "Market Price (guide)", store: false },
  };
  for (const c of dbCards) {
    const real = c.externalId ? realPrices.get(c.externalId) : undefined;
    const q = encodeURIComponent(`${c.name} ${c.setName}`);
    const tcgUrl = real?.tcgUrl ?? `https://www.tcgplayer.com/search/pokemon/product?q=${q}`;
    const cmUrl = real?.cmUrl ?? `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${q}`;
    if (real?.tcgUsd != null) {
      for (const country of ["US", "NZ", "AU"] as const) {
        const b = BASE[country];
        priceRows.push({ cardId: c.id, retailer: b.retailer, retailerName: b.name, title: b.name, url: b.store ? tcgUrl : "", priceCents: cents(real.tcgUsd * FX[country]), currency: CUR[country], inStock: true, country });
      }
    }
    // Cardmarket → GB (EU/UK marketplace). Real URL + price.
    if (real?.cmUsd != null) {
      priceRows.push({ cardId: c.id, retailer: "cardmarket_gb", retailerName: "Cardmarket", title: "Cardmarket", url: cmUrl, priceCents: cents(real.cmUsd * FX.GB), currency: CUR.GB, inStock: true, country: "GB" });
    }
  }
  // Reset the catalogue-baseline rows we manage so re-seeds stay clean (and the old
  // AU "TCGplayer" rows are removed in favour of the new market guide).
  await prisma.retailerPrice.deleteMany({ where: { retailer: { in: ["tcgplayer_us", "tcgplayer_nz", "tcgplayer_au", "marketguide_au", "cardmarket_gb"] } } });
  console.log(`Inserting ${priceRows.length} retailer prices…`);
  for (let i = 0; i < priceRows.length; i += 5000) {
    await prisma.retailerPrice.createMany({ data: priceRows.slice(i, i + 5000), skipDuplicates: true });
    process.stdout.write(`\r  ${Math.min(i + 5000, priceRows.length)}/${priceRows.length}`);
  }
  console.log("\nRetailer prices inserted.");

  // ---- sealed products (booster boxes, ETBs, bundles, packs) -----------------
  const { POKEMON_SETS } = await import("../src/lib/pokemon-sets");
  // eBay omitted here too — real sealed eBay rows (key "ebay") come from importSealed().
  const sealedRetailers = [
    { key: "tcgplayer", name: "TCGplayer", country: "US", currency: "USD" },
    { key: "trollandtoad", name: "Troll and Toad", country: "US", currency: "USD" },
    // UK MODE sealed sources
    { key: "chaoscards", name: "Chaos Cards", country: "GB", currency: "GBP" },
    { key: "magicmadhouse", name: "Magic Madhouse", country: "GB", currency: "GBP" },
    { key: "totalcards", name: "Total Cards", country: "GB", currency: "GBP" },
    { key: "elementgames", name: "Element Games", country: "GB", currency: "GBP" },
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
