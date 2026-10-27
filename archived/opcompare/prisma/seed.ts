import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { characterOf } from "../src/lib/op-characters";
import { normalizeSearch } from "../src/lib/format";
import { POKEMON_SETS } from "../src/lib/pokemon-sets";
import { enrichFromTcgplayer, buildCatalog } from "./tcgplayer-enrich.mjs";
import { importStores } from "./store-import.mjs";

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

// Reference NM price in USD cents by rarity (One Piece singles).
const RARITY_PRICE_USD: Record<string, [number, number]> = {
  Common: [10, 60],
  Uncommon: [15, 120],
  Rare: [40, 320],
  "Super Rare": [150, 900],
  "Secret Rare": [800, 6000],
  Leader: [80, 500],
  Special: [600, 4000],
  "Manga Rare": [2000, 12000],
  Promo: [100, 1500],
};
function refUsd(rarity: string): number {
  const [lo, hi] = RARITY_PRICE_USD[rarity] ?? [20, 200];
  return between(lo, hi);
}
// First-set premium: OP01 Romance Dawn (2022) reprints are scarce vs demand.
function ageMult(setCode: string): number {
  if (setCode === "OP01") return between(1.6, 3.0);
  if (setCode === "OP02") return between(1.2, 1.8);
  return 1;
}
const CHASE: { re: RegExp; mult: number }[] = [
  { re: /shanks|kaido|charlotte (linlin|katakuri)|gol d\. roger/i, mult: 2.2 },
  { re: /monkey d\. luffy|roronoa zoro|portgas d\. ace|boa hancock|yamato|dracule mihawk|nami/i, mult: 1.8 },
];
function chaseMult(name: string, rarity: string): number {
  let m = 1;
  for (const c of CHASE) if (c.re.test(name)) m = Math.max(m, c.mult);
  if (/Secret Rare|Manga Rare|Special/.test(rarity)) m *= between(1.2, 1.8);
  return m;
}

const FX: Record<string, number> = { US: 1.0, AU: 1.55, NZ: 1.68, GB: 0.82 };
const CUR: Record<string, string> = { US: "USD", AU: "AUD", NZ: "NZD", GB: "GBP" };
const cents = (n: number, floor = 8) => Math.max(floor, Math.round(n));
const MARKETS = ["US", "AU", "GB", "NZ"] as const;
// TCGplayer ships these markets but NOT Australia — so it's never offered for AU.
const TCG_MARKETS = ["US", "GB", "NZ"] as const;

type CardX = BuiltCard & { productUrl?: string | null; marketCents?: number | null };
type ShopRow = { retailer: string; retailerName: string; country: string; currency: string; url: string; priceCents: number | null; inStock: boolean };

async function main() {
  // Build the One Piece catalogue straight from TCGplayer — authoritative names,
  // codes, sets, CLEAN images (no Bandai "SAMPLE" watermark) and real US prices.
  // The old hand-curated list had inaccurate name↔code pairings, so we prefer the
  // TCGplayer catalogue and only fall back to the committed file if it's unreachable.
  let cards: CardX[] = [];
  let usingTcg = false;
  try {
    const tcg = (await buildCatalog("one-piece-card-game")) as CardX[];
    if (tcg.length >= 100) { cards = tcg; usingTcg = true; console.log(`Using TCGplayer One Piece catalogue: ${tcg.length} cards (clean images + real prices).`); }
  } catch (e) { console.warn("buildCatalog failed:", (e as Error).message); }
  if (!usingTcg) {
    cards = JSON.parse(readFileSync(join(process.cwd(), "prisma", "op-cards.json"), "utf8")) as CardX[];
    console.log(`Fell back to the committed One Piece catalogue: ${cards.length} cards.`);
  }

  // When using the committed fallback, enrich by name for clean images + real links.
  const TCG = usingTcg
    ? new Map<string, { productId: number; productUrl: string; imageUrl: string; marketCents: number | null }>()
    : await enrichFromTcgplayer("one-piece-card-game", cards).catch((e) => {
        console.warn("TCGplayer enrichment failed:", e.message);
        return new Map<string, { productId: number; productUrl: string; imageUrl: string; marketCents: number | null }>();
      });
  // Per-card image / product URL / market price (from the catalogue or enrichment).
  const infoOf = (c: CardX) => {
    if (usingTcg) return { imageUrl: c.imageUrl ?? null, productUrl: c.productUrl ?? null, marketCents: c.marketCents ?? null };
    const e = TCG.get(c.externalId);
    return { imageUrl: e?.imageUrl ?? null, productUrl: e?.productUrl ?? null, marketCents: e?.marketCents ?? null };
  };

  console.log("Resetting data…");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RetailerPrice"');
  await prisma.deal.deleteMany();
  await prisma.sealedListing.deleteMany();
  await prisma.card.deleteMany();


  type Built = CardX & { usdRef: number };
  const built: Built[] = cards.map((c) => ({
    ...c,
    usdRef: cents(refUsd(c.rarity) * ageMult(c.setCode) * chaseMult(c.name, c.rarity)),
  }));

  const cardRows = built.map((c) => {
    const info = infoOf(c);
    const ch = characterOf(c.name, c.type);
    return {
      externalId: c.externalId,
      slug: `${c.externalId}-${normalizeSearch(c.name).replace(/\s+/g, "-")}`.toLowerCase().slice(0, 80),
      name: c.name,
      nameNormalized: normalizeSearch(c.name),
      characterSlug: ch?.slug ?? null,
      characterName: ch?.name ?? null,
      setCode: c.setCode,
      setName: c.setName,
      collectorNumber: c.collectorNumber,
      domain: c.domain,
      type: c.type,
      rarity: c.rarity,
      tags: c.subtype,
      flavorText: c.flavorText,
      description: c.subtype ? `${c.subtype}` : null,
      // CLEAN TCGplayer image; otherwise null → the self-contained SVG card art
      // renders. We NEVER store the watermarked Limitless URL.
      imageUrl: info.imageUrl,
      imageThumbUrl: info.imageUrl,
      marketPriceCents: info.marketCents ?? c.usdRef,
      marketPriceSource: info.marketCents != null ? "TCGplayer" : "Estimate",
      marketPriceUpdatedAt: new Date(),
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });

  console.log("Inserting cards…");
  for (let i = 0; i < cardRows.length; i += 2000) await prisma.card.createMany({ data: cardRows.slice(i, i + 2000), skipDuplicates: true });

  const dbCards = await prisma.card.findMany({ select: { id: true, externalId: true, name: true, setName: true, collectorNumber: true, marketPriceCents: true } });
  const productUrlByExt = new Map(built.map((c) => [c.externalId, infoOf(c).productUrl]));

  // (1) TCGplayer exact product page — US/GB/NZ only (NOT Australia).
  console.log("Writing TCGplayer (US/GB/NZ) deep-link rows…");
  const tcgRows: any[] = [];
  for (const c of dbCards) {
    const tcgUrl = productUrlByExt.get(c.externalId!) ?? null;
    if (!tcgUrl) continue;
    for (const market of TCG_MARKETS) {
      const price = cents(c.marketPriceCents * FX[market]);
      tcgRows.push({ cardId: c.id, retailer: `tcgplayer_${market.toLowerCase()}`, retailerName: "TCGplayer", title: `${c.name} (${c.setName})`, url: tcgUrl, condition: "NM", conditionPrices: { NM: price }, priceCents: price, currency: CUR[market], inStock: true, country: market });
    }
  }
  for (let i = 0; i < tcgRows.length; i += 5000) await prisma.retailerPrice.createMany({ data: tcgRows.slice(i, i + 5000), skipDuplicates: true });
  console.log(`Inserted ${tcgRows.length} TCGplayer rows.`);

  // (2) Real card stores across AU/NZ/US/GB — DexCompare's engine: sitemap collection
  // discovery + country-priced products.json + collector-code resolver. Real product
  // deep-links with real price + stock; a store appears only on cards it stocks.
  console.log("Importing live One Piece store prices (DexCompare engine)…");
  const imported = await importStores(prisma, dbCards as any, "one-piece-card-game").catch((e) => { console.warn("store import failed:", (e as Error).message); return { totalRows: 0 }; });
  console.log(`Store deep-link rows written: ${imported.totalRows}.`);

  // Recompute each card's per-market lowest from IN-STOCK rows (NM/LP or unstated grade).
  console.log("Recomputing per-market lowest prices…");
  const headlineWhere = (country: string) => ({ inStock: true, country, OR: [{ condition: { in: ["NM", "LP"] } }, { condition: null }] });
  const [au, nz, us, gb] = await Promise.all([
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("AU"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("NZ"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("US"), _min: { priceCents: true } }),
    prisma.retailerPrice.groupBy({ by: ["cardId"], where: headlineWhere("GB"), _min: { priceCents: true } }),
  ]);
  const mAu = new Map(au.map((r) => [r.cardId, r._min.priceCents])); const mNz = new Map(nz.map((r) => [r.cardId, r._min.priceCents]));
  const mUs = new Map(us.map((r) => [r.cardId, r._min.priceCents])); const mGb = new Map(gb.map((r) => [r.cardId, r._min.priceCents]));
  console.log("Updating card lowest-price columns…");
  for (let i = 0; i < dbCards.length; i += 500) {
    await Promise.all(dbCards.slice(i, i + 500).map((c) => prisma.card.update({ where: { id: c.id }, data: {
      lowestPriceCentsUs: mUs.get(c.id) ?? null, lowestPriceCents: mAu.get(c.id) ?? null, lowestPriceCentsGb: mGb.get(c.id) ?? null, lowestPriceCentsNz: mNz.get(c.id) ?? null,
    } })));
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

  // ---- sealed products (booster boxes, starter decks) ------------------------
  const sealedRetailers = [
    { key: "tcgplayer", name: "TCGplayer", country: "US" },
    { key: "coolstuffinc", name: "CoolStuffInc", country: "US" },
    { key: "goodgames", name: "Good Games", country: "AU" },
    { key: "magicmadhouse", name: "Magic Madhouse", country: "GB" },
    { key: "chaoscards", name: "Chaos Cards", country: "GB" },
  ];
  const PRODUCTS = [
    { type: "Booster Box", usd: [7000, 13000] as [number, number] },
    { type: "Booster Pack", usd: [350, 700] as [number, number] },
    { type: "Starter Deck", usd: [900, 1600] as [number, number] },
  ];
  const sealedRows: any[] = [];
  const sealedSets = POKEMON_SETS.filter((s) => s.code.startsWith("OP") || s.code.startsWith("EB") || s.code.startsWith("PRB")).slice(0, 30);
  for (const s of sealedSets) {
    for (const p of PRODUCTS) {
      const baseUsd = between(p.usd[0], p.usd[1]);
      for (const r of sealedRetailers) {
        const usd = baseUsd * between(0.95, 1.12);
        sealedRows.push({
          groupKey: `${s.code}-${p.type.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${s.name} ${p.type}`, productType: p.type, setCode: s.code,
          retailer: r.key, retailerName: r.name, priceCents: Math.round(usd * (FX[r.country] ?? 1)),
          url: `https://www.tcgplayer.com/search/one-piece-card-game/${s.slug}`, imageUrl: s.logo,
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
