import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSearch } from "../src/lib/format";
import { POKEMON_SETS } from "../src/lib/pokemon-sets";
import { buildStores, topStores } from "./stores.mjs";

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
const rng = mulberry32(20260613);
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

// Reference NM price in USD cents by rarity family (Magic singles).
const RARITY_PRICE_USD: Record<string, [number, number]> = {
  Common: [10, 70],
  Uncommon: [15, 140],
  Rare: [90, 900],
  Mythic: [350, 3500],
  "Mythic Rare": [350, 3500],
  Special: [250, 2800],
  Promo: [150, 2200],
  Expedition: [1500, 9000],
  Land: [40, 600],
};
function refUsd(rarity: string): number {
  const [lo, hi] = RARITY_PRICE_USD[rarity] ?? [20, 200];
  return between(lo, hi);
}

// Vintage premium: pre-modern Magic (especially 1993–1997 Reserved-List era)
// trades far above modern singles.
function ageMult(releaseDate: string): number {
  const year = parseInt(releaseDate.slice(0, 4), 10) || 2020;
  if (year <= 1994) return between(6.0, 16.0);
  if (year <= 1999) return between(2.5, 6.0);
  if (year <= 2006) return between(1.6, 3.2);
  if (year <= 2014) return between(1.15, 1.9);
  return 1;
}

// Chase premium — iconic Power Nine, dual/fetch/shock lands and format-defining
// staples trade far above their rarity baseline.
const CHASE: { re: RegExp; mult: number }[] = [
  { re: /black lotus/i, mult: 55 },
  { re: /ancestral recall/i, mult: 34 },
  { re: /time walk/i, mult: 30 },
  { re: /\bmox\b|mox (sapphire|ruby|pearl|emerald|jet|amber)/i, mult: 22 },
  { re: /timetwister/i, mult: 22 },
  { re: /library of alexandria|bazaar of baghdad/i, mult: 24 },
  { re: /the tabernacle/i, mult: 26 },
  { re: /mana drain/i, mult: 8 },
  { re: /the one ring/i, mult: 9 },
  { re: /orcish bowmasters|sheoldred|ragavan|oko, thief|liliana of the veil/i, mult: 5 },
  { re: /snapcaster mage|teferi, time raveler|the great henge|cavern of souls/i, mult: 3.5 },
];
function chaseMult(name: string, domain: string, type: string, subtype: string | null): number {
  let m = 1;
  for (const c of CHASE) if (c.re.test(name)) m = Math.max(m, c.mult);
  // Non-basic lands (fetch/shock/utility) carry a premium over the rarity floor.
  if (type === "Land" && domain === "Land") m *= between(1.6, 2.6);
  if ((subtype ?? "").toLowerCase() === "mox" && !/mox amber|chrome mox/i.test(name)) m *= 1; // handled above
  return m;
}

const USD_TO_AUD = 1.55;
const USD_TO_NZD = 1.68;
const USD_TO_GBP = 0.82;
const FX: Record<string, number> = { US: 1.0, AU: USD_TO_AUD, NZ: USD_TO_NZD, GB: USD_TO_GBP };
const CUR: Record<string, string> = { US: "USD", AU: "AUD", NZ: "NZD", GB: "GBP" };
const cents = (n: number, floor = 8) => Math.max(floor, Math.round(n));

// Real Magic retailers per market. Outbound links go to each store's search so
// the affiliate layer (eBay EPN, TCGplayer Impact, Sovrn for the rest) monetises
// every click. eBay rows are added separately per market.
const SPR = parseInt(process.env.STORES_PER_REGION || "0", 10);
const STORES: Record<string, { key: string; name: string; search: (q: string) => string }[]> = SPR > 0 ? topStores("magic", SPR) : buildStores("magic");

async function main() {
  const cards = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "mtg-cards.json"), "utf8")
  ) as BuiltCard[];
  console.log(`Loaded ${cards.length} Magic cards from the offline data mirror.`);

  console.log("Resetting data…");
  await prisma.order.deleteMany();
  await prisma.buyOrder.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RetailerPrice"');
  await prisma.priceHistory.deleteMany();
  await prisma.sealedListing.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: { email: "demo@mtgcompare.app", passwordHash, displayName: "MTGCollector", balanceCents: 50000, isAdmin: true },
  });
  const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$10$O5fONAak2jY/zGCVkbhp/.sIxGuqmGfYU0DxNgOpf8sTC64qQFxum";
  await prisma.user.upsert({
    where: { email: "compareempire" },
    update: { passwordHash: ADMIN_HASH, isAdmin: true, verifiedSeller: true, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", emailVerified: new Date() },
    create: { email: "compareempire", passwordHash: ADMIN_HASH, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", isAdmin: true, verifiedSeller: true, emailVerified: new Date() },
  });

  // ---- cards (USD reference price; per-market lows computed from store rows) ----
  type Built = BuiltCard & { usdRef: number };
  const built: Built[] = cards.map((c) => ({
    ...c,
    usdRef: cents(refUsd(c.rarity) * ageMult(c.releaseDate) * chaseMult(c.name, c.domain, c.type, c.subtype)),
  }));

  const cardRows = built.map((c) => ({
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
    description: c.artist ? `Illustrated by ${c.artist}` : null,
    imageUrl: c.imageUrl,
    imageThumbUrl: c.imageThumbUrl,
    marketPriceCents: c.usdRef,
    marketPriceSource: "Estimate",
    marketPriceUpdatedAt: new Date(),
    // lowest-price columns are filled below from the generated store rows.
    artSeed: Math.floor(rng() * 1_000_000),
  }));

  console.log("Inserting cards…");
  const CHUNK = 2000;
  for (let i = 0; i < cardRows.length; i += CHUNK) {
    await prisma.card.createMany({ data: cardRows.slice(i, i + CHUNK), skipDuplicates: true });
  }

  const dbCards = await prisma.card.findMany({
    select: { id: true, externalId: true, name: true, setName: true, marketPriceCents: true, rarity: true },
  });
  const refById = new Map(built.map((b) => [b.externalId, b]));

  console.log(`Building retailer prices for ${dbCards.length} cards…`);
  const priceRows: any[] = [];
  const lows: Record<string, Record<string, number>> = {}; // externalId -> {market -> minCents}

  for (const c of dbCards) {
    const usd = c.marketPriceCents; // USD cents reference
    const q = encodeURIComponent(`${c.name} ${c.setName}`);
    lows[c.externalId!] = {};
    for (const market of ["US", "AU", "GB", "NZ"] as const) {
      const fx = FX[market];
      const cur = CUR[market];
      const marketStores = STORES[market];
      let marketMin = Infinity;
      for (const s of marketStores) {
        const nm = cents(usd * fx * between(0.9, 1.25));
        const conditionPrices = {
          NM: nm,
          LP: cents(nm * 0.85),
          MP: cents(nm * 0.7),
          HP: cents(nm * 0.55),
        };
        priceRows.push({
          cardId: c.id,
          retailer: s.key,
          retailerName: s.name,
          title: `${c.name} (${c.setName})`,
          url: s.search(q),
          condition: "NM",
          conditionPrices,
          priceCents: nm,
          shippingCents: market === "US" ? cents(between(0, 199)) : cents(between(0, 350)),
          currency: cur,
          inStock: rng() > 0.08,
          country: market,
        });
        marketMin = Math.min(marketMin, nm);
      }
      lows[c.externalId!][market] = marketMin === Infinity ? 0 : marketMin;
    }
  }

  console.log(`Inserting ${priceRows.length} retailer prices…`);
  for (let i = 0; i < priceRows.length; i += 5000) {
    await prisma.retailerPrice.createMany({ data: priceRows.slice(i, i + 5000), skipDuplicates: true });
  }

  // Backfill each card's per-market lowest-price columns from the store rows.
  console.log("Updating card lowest-price columns…");
  for (const c of dbCards) {
    const l = lows[c.externalId!] ?? {};
    await prisma.card.update({
      where: { id: c.id },
      data: {
        lowestPriceCentsUs: l.US ?? null,
        lowestPriceCents: l.AU ?? null,
        lowestPriceCentsGb: l.GB ?? null,
        lowestPriceCentsNz: l.NZ ?? null,
      },
    });
  }

  // ---- sealed products (booster boxes, bundles, decks) -----------------------
  const sealedRetailers = [
    { key: "tcgplayer", name: "TCGplayer", country: "US", currency: "USD" },
    { key: "coolstuffinc", name: "CoolStuffInc", country: "US", currency: "USD" },
    { key: "goodgames", name: "Good Games", country: "AU", currency: "AUD" },
    { key: "magicmadhouse", name: "Magic Madhouse", country: "GB", currency: "GBP" },
    { key: "chaoscards", name: "Chaos Cards", country: "GB", currency: "GBP" },
  ];
  const PRODUCTS = [
    { type: "Play Booster Box", usd: [9000, 16000] as [number, number] },
    { type: "Collector Booster Box", usd: [18000, 32000] as [number, number] },
    { type: "Bundle", usd: [3500, 5500] as [number, number] },
    { type: "Commander Deck", usd: [3000, 5000] as [number, number] },
  ];
  const sealedRows: any[] = [];
  const sealedSets = POKEMON_SETS.filter((s) => (parseInt(s.releaseDate.slice(0, 4), 10) || 0) >= 2014).slice(0, 40);
  for (const s of sealedSets) {
    for (const p of PRODUCTS) {
      const baseUsd = between(p.usd[0], p.usd[1]);
      for (const r of sealedRetailers) {
        const usd = baseUsd * between(0.95, 1.12);
        const price = usd * (FX[r.country] ?? 1);
        sealedRows.push({
          groupKey: `${s.code}-${p.type.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${s.name} ${p.type}`,
          productType: p.type,
          setCode: s.code,
          retailer: r.key,
          retailerName: r.name,
          priceCents: Math.round(price),
          url: `https://www.tcgplayer.com/search/magic/${s.slug}?productLineName=magic`,
          imageUrl: s.logo,
          inStock: rng() > 0.2,
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
