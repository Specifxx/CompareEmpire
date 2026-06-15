import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeSearch } from "../src/lib/format";
import { POKEMON_SETS } from "../src/lib/pokemon-sets";
import { buildStores, topStores, storeQuery } from "./stores.mjs";
import { enrichFromTcgplayer } from "./tcgplayer-enrich.mjs";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260613);
const between = (min: number, max: number) => min + rng() * (max - min);

interface BuiltCard {
  externalId: string; name: string; setCode: string; setName: string; releaseDate: string;
  collectorNumber: string; number: string; domain: string; type: string; subtype: string | null;
  rarity: string; hp: number | null; artist: string | null; flavorText: string | null;
  imageUrl: string | null; imageThumbUrl: string | null;
}

// Reference NM price in USD cents by rarity (Yu-Gi-Oh! singles).
const RARITY_PRICE_USD: Record<string, [number, number]> = {
  Common: [10, 50],
  Rare: [15, 90],
  "Super Rare": [40, 250],
  "Ultra Rare": [120, 800],
  "Secret Rare": [300, 2000],
  "Ultimate Rare": [400, 2500],
  "Ghost Rare": [800, 5000],
  "Starlight Rare": [3000, 18000],
  "Quarter Century Secret Rare": [600, 4000],
  "Prismatic Secret Rare": [500, 3000],
  Promo: [80, 1200],
};
function refUsd(rarity: string): number {
  const [lo, hi] = RARITY_PRICE_USD[rarity] ?? [20, 200];
  return between(lo, hi);
}
// Vintage premium: 2002–2004 first-print staples trade well above modern reprints.
function ageMult(releaseDate: string): number {
  const year = parseInt(releaseDate.slice(0, 4), 10) || 2020;
  if (year <= 2002) return between(2.4, 5.5);
  if (year <= 2005) return between(1.5, 3.0);
  return 1;
}
const CHASE: { re: RegExp; mult: number }[] = [
  { re: /blue-eyes white dragon|dark magician|exodia/i, mult: 2.4 },
  { re: /ash blossom|maxx|accesscode|snake-eye|kashtira|tearlaments|fiendsmith|infinite impermanence/i, mult: 1.8 },
];
function chaseMult(name: string, rarity: string): number {
  let m = 1;
  for (const c of CHASE) if (c.re.test(name)) m = Math.max(m, c.mult);
  if (/Ghost Rare|Starlight Rare/.test(rarity)) m *= between(1.3, 2.0);
  return m;
}

const FX: Record<string, number> = { US: 1.0, AU: 1.55, NZ: 1.68, GB: 0.82 };
const CUR: Record<string, string> = { US: "USD", AU: "AUD", NZ: "NZD", GB: "GBP" };
const cents = (n: number, floor = 8) => Math.max(floor, Math.round(n));

const STORES: Record<string, { key: string; name: string; search: (q: string) => string }[]> = topStores("yugioh", parseInt(process.env.STORES_PER_REGION || "10", 10));

async function main() {
  const cards = JSON.parse(readFileSync(join(process.cwd(), "prisma", "ygo-cards.json"), "utf8")) as BuiltCard[];
  console.log(`Loaded ${cards.length} Yu-Gi-Oh! cards from the offline data mirror.`);

  // The full Yu-Gi-Oh! catalogue is 12,768 cards — far too many for per-card
  // TCGplayer lookups (rate-limit risk). ygoprodeck images are already clean and
  // the name-only store search links resolve to the card, so we enrich only the
  // highest-value cards (where an exact product link + real price matter most).
  const topForEnrich = [...cards]
    .map((c) => ({ c, ref: refUsd(c.rarity) * ageMult(c.releaseDate) * chaseMult(c.name, c.rarity) }))
    .sort((a, b) => b.ref - a.ref)
    .slice(0, 1500)
    .map((x) => x.c);
  const TCG = await enrichFromTcgplayer("yugioh", topForEnrich, { concurrency: 6 }).catch((e) => {
    console.warn("TCGplayer enrichment failed:", e.message);
    return new Map<string, { productId: number; productUrl: string; imageUrl: string; marketCents: number | null }>();
  });

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
  await prisma.user.create({ data: { email: "demo@ygocompare.app", passwordHash, displayName: "YGOCollector", balanceCents: 50000, isAdmin: true } });
  const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$10$O5fONAak2jY/zGCVkbhp/.sIxGuqmGfYU0DxNgOpf8sTC64qQFxum";
  await prisma.user.upsert({
    where: { email: "compareempire" },
    update: { passwordHash: ADMIN_HASH, isAdmin: true, verifiedSeller: true, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", emailVerified: new Date() },
    create: { email: "compareempire", passwordHash: ADMIN_HASH, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", isAdmin: true, verifiedSeller: true, emailVerified: new Date() },
  });

  type Built = BuiltCard & { usdRef: number };
  const built: Built[] = cards.map((c) => ({
    ...c,
    usdRef: cents(refUsd(c.rarity) * ageMult(c.releaseDate) * chaseMult(c.name, c.rarity)),
  }));

  const cardRows = built.map((c) => {
    const enr = TCG.get(c.externalId);
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
      description: c.subtype ? `${c.subtype}` : null,
      // ygoprodeck images are clean; only override with TCGplayer's when matched.
      imageUrl: enr?.imageUrl ?? c.imageUrl,
      imageThumbUrl: enr?.imageUrl ?? c.imageThumbUrl,
      marketPriceCents: enr?.marketCents ?? c.usdRef,
      marketPriceSource: enr?.marketCents != null ? "TCGplayer" : "Estimate",
      marketPriceUpdatedAt: new Date(),
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });

  console.log("Inserting cards…");
  for (let i = 0; i < cardRows.length; i += 2000) await prisma.card.createMany({ data: cardRows.slice(i, i + 2000), skipDuplicates: true });

  const dbCards = await prisma.card.findMany({ select: { id: true, externalId: true, name: true, setName: true, marketPriceCents: true } });
  console.log(`Building retailer prices for ${dbCards.length} cards…`);
  const priceRows: any[] = [];
  const lows: Record<string, Record<string, number>> = {};
  for (const c of dbCards) {
    const usd = c.marketPriceCents;
    const enr = TCG.get(c.externalId!);
    const q = encodeURIComponent(storeQuery(c));
    lows[c.externalId!] = {};
    for (const market of ["US", "AU", "GB", "NZ"] as const) {
      const fx = FX[market]; const cur = CUR[market];
      const marketStores = STORES[market];
      let marketMin = Infinity;
      for (const s of marketStores) {
        // US TCGplayer: when matched, link to the REAL product page at the REAL
        // market price (accurate "View deal" → exact card), like dexcompare.
        const isRealTcg = s.key === "tcgplayer_us" && enr != null;
        const nm = isRealTcg && enr!.marketCents != null ? enr!.marketCents : cents(usd * fx * between(0.9, 1.25));
        priceRows.push({
          cardId: c.id, retailer: s.key, retailerName: s.name, title: `${c.name} (${c.setName})`,
          url: isRealTcg ? enr!.productUrl : s.search(q), condition: "NM",
          conditionPrices: { NM: nm, LP: cents(nm * 0.85), MP: cents(nm * 0.7), HP: cents(nm * 0.55) },
          priceCents: nm, shippingCents: market === "US" ? cents(between(0, 199)) : cents(between(0, 350)),
          currency: cur, inStock: isRealTcg ? true : rng() > 0.08, country: market,
        });
        marketMin = Math.min(marketMin, nm);
      }
      lows[c.externalId!][market] = marketMin === Infinity ? 0 : marketMin;
    }
  }
  console.log(`Inserting ${priceRows.length} retailer prices…`);
  for (let i = 0; i < priceRows.length; i += 5000) await prisma.retailerPrice.createMany({ data: priceRows.slice(i, i + 5000), skipDuplicates: true });

  console.log("Updating card lowest-price columns…");
  for (let i = 0; i < dbCards.length; i += 500) {
    await Promise.all(dbCards.slice(i, i + 500).map((c) => {
      const l = lows[c.externalId!] ?? {};
      return prisma.card.update({ where: { id: c.id }, data: {
        lowestPriceCentsUs: l.US ?? null, lowestPriceCents: l.AU ?? null, lowestPriceCentsGb: l.GB ?? null, lowestPriceCentsNz: l.NZ ?? null,
      } });
    }));
  }

  // ---- price-history snapshots (powers the Market Index, biggest movers & card charts) ----
  console.log("Recording price-history snapshots…");
  const topCards = await prisma.card.findMany({
    orderBy: { marketPriceCents: "desc" }, take: 300,
    select: { id: true, lowestPriceCentsUs: true, lowestPriceCents: true, lowestPriceCentsGb: true, lowestPriceCentsNz: true },
  });
  const OFFSETS = [0, 1, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  const today0 = new Date(); today0.setUTCHours(0, 0, 0, 0);
  const histRows: { cardId: string; country: string; day: Date; lowestPriceCents: number }[] = [];
  for (const c of topCards) {
    const cur: Record<string, number | null> = { US: c.lowestPriceCentsUs, AU: c.lowestPriceCents, GB: c.lowestPriceCentsGb, NZ: c.lowestPriceCentsNz };
    for (const market of ["US", "AU", "GB", "NZ"] as const) {
      const base = cur[market]; if (!base) continue;
      let v = base;
      for (const off of OFFSETS) {
        histRows.push({ cardId: c.id, country: market, day: new Date(today0.getTime() - off * 86400e3), lowestPriceCents: Math.max(8, Math.round(v)) });
        v = v * (1 + between(-0.035, 0.035)); // gentle random walk into the past
      }
    }
  }
  for (let i = 0; i < histRows.length; i += 5000) await prisma.priceHistory.createMany({ data: histRows.slice(i, i + 5000), skipDuplicates: true });
  console.log(`Recorded ${histRows.length} price-history points across ${topCards.length} cards.`);

  // ---- sealed products (booster boxes, packs, tins) --------------------------
  const sealedRetailers = [
    { key: "tcgplayer", name: "TCGplayer", country: "US" },
    { key: "trollandtoad", name: "Troll and Toad", country: "US" },
    { key: "goodgames", name: "Good Games", country: "AU" },
    { key: "chaoscards", name: "Chaos Cards", country: "GB" },
    { key: "totalcards", name: "Total Cards", country: "GB" },
  ];
  const PRODUCTS = [
    { type: "Booster Box", usd: [6000, 11000] as [number, number] },
    { type: "Booster Pack", usd: [350, 600] as [number, number] },
    { type: "Structure Deck", usd: [900, 1500] as [number, number] },
  ];
  const sealedRows: any[] = [];
  const sealedSets = POKEMON_SETS.filter((s) => (parseInt(s.releaseDate.slice(0, 4), 10) || 0) >= 2021).slice(0, 30);
  for (const s of sealedSets) {
    for (const p of PRODUCTS) {
      const baseUsd = between(p.usd[0], p.usd[1]);
      for (const r of sealedRetailers) {
        const usd = baseUsd * between(0.95, 1.12);
        sealedRows.push({
          groupKey: `${s.code}-${p.type.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${s.name} ${p.type}`, productType: p.type, setCode: s.code,
          retailer: r.key, retailerName: r.name, priceCents: Math.round(usd * (FX[r.country] ?? 1)),
          url: `https://www.tcgplayer.com/search/yugioh/${s.slug}`, imageUrl: s.logo,
          inStock: rng() > 0.2, country: r.country,
        });
      }
    }
  }
  await prisma.sealedListing.createMany({ data: sealedRows, skipDuplicates: true });
  console.log(`Created ${sealedRows.length} sealed product listings across ${sealedSets.length} sets.`);
  console.log("Seed complete ✔");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
