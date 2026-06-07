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

const USD_TO_AUD = 1.55;
const USD_TO_NZD = 1.68;
const cents = (n: number, floor = 8) => Math.max(floor, Math.round(n));

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

  // ---- cards (compute per-market lowest price) -------------------------------
  const cardRows = cards.map((c) => {
    const baseUsd = refUsd(c.rarity) * ageMult(c.releaseDate);
    const usLow = cents(baseUsd * between(0.92, 1.0));
    const auLow = cents(usLow * USD_TO_AUD * between(0.95, 1.08), 10);
    const nzLow = cents(usLow * USD_TO_NZD * between(0.96, 1.1), 10);
    return {
      externalId: c.externalId,
      slug: `${c.externalId}-${normalizeSearch(c.name).replace(/\s+/g, "-")}`.slice(0, 80),
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
    select: { id: true, externalId: true, lowestPriceCentsUs: true, lowestPriceCents: true },
  });
  console.log(`Building retailer prices for ${dbCards.length} cards…`);

  // TCGplayer + Troll and Toad are the headline US sources the brief asked for.
  const usRetailers = [
    { key: "tcgplayer", name: "TCGplayer", url: (c: string) => `https://www.tcgplayer.com/search/pokemon/product?q=${c}`, spread: [0.95, 1.05] as [number, number] },
    { key: "trollandtoad", name: "Troll and Toad", url: (c: string) => `https://www.trollandtoad.com/category.php?search-words=${c}`, spread: [0.98, 1.12] as [number, number] },
    { key: "ebay_us", name: "eBay US", url: (c: string) => `https://www.ebay.com/sch/i.html?_nkw=${c}+pokemon+card`, spread: [0.9, 1.2] as [number, number] },
    { key: "cardmarket", name: "Cardmarket", url: (c: string) => `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${c}`, spread: [0.85, 1.05] as [number, number] },
  ];
  const auRetailers = [
    { key: "ebay_au", name: "eBay AU", url: (c: string) => `https://www.ebay.com.au/sch/i.html?_nkw=${c}+pokemon+card`, spread: [0.95, 1.2] as [number, number] },
    { key: "pokemarket", name: "Pokémon Market AU", url: (c: string) => `https://pokemarket.com.au/search?q=${c}`, spread: [0.98, 1.15] as [number, number] },
  ];

  const priceRows: {
    cardId: string; retailer: string; retailerName: string; title: string; url: string;
    priceCents: number; currency: string; inStock: boolean; country: string;
  }[] = [];
  for (const c of dbCards) {
    const q = encodeURIComponent(c.externalId);
    for (const r of usRetailers) {
      priceRows.push({
        cardId: c.id, retailer: r.key, retailerName: r.name, title: r.name, url: r.url(q),
        priceCents: cents((c.lowestPriceCentsUs ?? 50) * between(r.spread[0], r.spread[1])),
        currency: "USD", inStock: true, country: "US",
      });
    }
    for (const r of auRetailers) {
      priceRows.push({
        cardId: c.id, retailer: r.key, retailerName: r.name, title: r.name, url: r.url(q),
        priceCents: cents((c.lowestPriceCents ?? 80) * between(r.spread[0], r.spread[1]), 10),
        currency: "AUD", inStock: true, country: "AU",
      });
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
        const price = r.currency === "AUD" ? usd * USD_TO_AUD : usd;
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
