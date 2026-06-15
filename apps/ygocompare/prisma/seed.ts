import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
const MARKETS = ["US", "AU", "GB", "NZ"] as const;
// TCGplayer ships these markets but NOT Australia — so it's never offered for AU.
const TCG_MARKETS = ["US", "GB", "NZ"] as const;
type ShopRow = { retailer: string; retailerName: string; country: string; currency: string; url: string; priceCents: number | null; inStock: boolean };
// Yu-Gi-Oh! codes (e.g. ROTD-EN036) are globally unique, so a TCGplayer search by
// the code lands directly on that one card — used for cards outside the top-value
// set we fetch exact product ids for.
const tcgCodeSearch = (code: string) => `https://www.tcgplayer.com/search/yugioh/product?q=${encodeURIComponent(code)}`;
// Region-agnostic card-code key (set-code + number, language infix dropped) so a
// card's "ROTD-EN036" keys to "rotd036" — used to merge the bulk TCGplayer price
// catalogue into our offline-mirror cards by their unique code.
const ygoCodeKey = (s: string) => {
  const m = String(s || "").toLowerCase().match(/([a-z0-9]{2,6})-([a-z]{0,3})(\d{1,4})/);
  return m ? m[1] + m[3] : "";
};

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

  // Bulk: pull the WHOLE TCGplayer Yu-Gi-Oh! price catalogue (offset-paginated, by
  // unique card code). This gives EVERY matchable card a real market price + exact
  // product link — not just the top 1500 — so the AU view (TCGplayer doesn't serve
  // AU) can show a real market guide instead of nothing for the long tail. Cards
  // with no TCGplayer match stay "Estimate" and remain unpriced (accuracy first).
  const tcgBulk = await buildCatalog("yugioh", { mode: "code" }).catch((e) => {
    console.warn("TCGplayer bulk catalogue failed:", (e as Error).message);
    return [] as Array<{ collectorNumber: string; productUrl: string; imageUrl: string; marketCents: number | null }>;
  });
  const bulkByCode = new Map<string, { productUrl: string; imageUrl: string; marketCents: number | null }>();
  for (const t of tcgBulk) {
    const k = ygoCodeKey(t.collectorNumber);
    if (k && !bulkByCode.has(k)) bulkByCode.set(k, { productUrl: t.productUrl, imageUrl: t.imageUrl, marketCents: t.marketCents });
  }
  console.log(`TCGplayer bulk: ${bulkByCode.size} unique Yu-Gi-Oh! codes priced.`);

  // Full real-price coverage. TCGplayer's search API caps pagination at ~10k
  // results, so the bulk pull above can't reach the long tail. ygoprodeck
  // publishes a real market price (TCGplayer, else Cardmarket/eBay/CoolStuffInc)
  // for essentially EVERY card, keyed by passcode (= our externalId without the
  // leading "y"), so all ~12.7k cards get a real price in every market. Degrades
  // gracefully to the bulk/estimate prices if unreachable.
  const ygoPrice = new Map<string, { cents: number; source: string }>();
  try {
    const res = await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=no", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", Accept: "application/json" },
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: Array<{ id: number; card_prices?: Array<Record<string, string>> }> };
    const EUR_USD = 1.08;
    for (const c of data.data ?? []) {
      const cp = c.card_prices?.[0] ?? {};
      const tcg = parseFloat(cp.tcgplayer_price || "0");
      let cents = 0, source = "";
      if (tcg > 0) { cents = Math.round(tcg * 100); source = "TCGplayer"; }
      else {
        const cm = parseFloat(cp.cardmarket_price || "0");
        const csi = parseFloat(cp.coolstuffinc_price || "0");
        const eb = parseFloat(cp.ebay_price || "0");
        const alt = cm > 0 ? cm * EUR_USD : csi > 0 ? csi : eb;
        if (alt > 0) { cents = Math.round(alt * 100); source = "Market"; }
      }
      if (cents > 0) ygoPrice.set(String(c.id), { cents, source });
    }
    console.log(`ygoprodeck: real market prices for ${ygoPrice.size} cards.`);
  } catch (e) {
    console.warn("ygoprodeck price fetch failed (long-tail cards stay estimate):", (e as Error).message);
  }

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
    // Price priority: exact per-printing TCGplayer match (targeted, then bulk by
    // code) → ygoprodeck's market price (covers the long tail TCGplayer's paged
    // API can't reach) → seed-time estimate as a last resort.
    const bulk = bulkByCode.get(ygoCodeKey(c.collectorNumber));
    const ygo = c.externalId.startsWith("y") ? ygoPrice.get(c.externalId.slice(1)) : undefined;
    const exactCents = enr?.marketCents ?? bulk?.marketCents ?? null;
    const realCents = exactCents ?? ygo?.cents ?? null;
    const realSource = exactCents != null ? "TCGplayer" : ygo?.source ?? null;
    const tcgImage = enr?.imageUrl ?? bulk?.imageUrl ?? null;
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
      imageUrl: tcgImage ?? c.imageUrl,
      imageThumbUrl: tcgImage ?? c.imageThumbUrl,
      marketPriceCents: realCents ?? c.usdRef,
      marketPriceSource: realCents != null ? realSource! : "Estimate",
      marketPriceUpdatedAt: new Date(),
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });

  console.log("Inserting cards…");
  for (let i = 0; i < cardRows.length; i += 2000) await prisma.card.createMany({ data: cardRows.slice(i, i + 2000), skipDuplicates: true });

  const dbCards = await prisma.card.findMany({ select: { id: true, externalId: true, name: true, setName: true, collectorNumber: true, marketPriceCents: true, marketPriceSource: true } });

  // (1) TCGplayer deep-link — US/GB/NZ only (NOT Australia). Exact product page for
  // the top-value cards we fetched ids for; else a code search that lands on the one
  // card (YGO codes are unique). Only written for cards genuinely on TCGplayer
  // (real TCGplayer price) — "Market"/estimate cards show the market guide instead
  // of a TCGplayer link that might not resolve.
  console.log("Writing TCGplayer (US/GB/NZ) deep-link rows…");
  const tcgRows: any[] = [];
  for (const c of dbCards) {
    if (c.marketPriceSource !== "TCGplayer") continue;
    const enr = TCG.get(c.externalId!);
    const tcgUrl = enr?.productUrl ?? bulkByCode.get(ygoCodeKey(c.collectorNumber))?.productUrl ?? tcgCodeSearch(c.collectorNumber);
    for (const market of TCG_MARKETS) {
      const price = cents(c.marketPriceCents * FX[market]);
      tcgRows.push({ cardId: c.id, retailer: `tcgplayer_${market.toLowerCase()}`, retailerName: "TCGplayer", title: `${c.name} (${c.setName})`, url: tcgUrl, condition: "NM", conditionPrices: { NM: price }, priceCents: price, currency: CUR[market], inStock: true, country: market });
    }
  }
  for (let i = 0; i < tcgRows.length; i += 5000) await prisma.retailerPrice.createMany({ data: tcgRows.slice(i, i + 5000), skipDuplicates: true });
  console.log(`Inserted ${tcgRows.length} TCGplayer rows.`);

  // (2) Real card stores across AU/NZ/US/GB — DexCompare's engine: sitemap collection
  // discovery + country-priced products.json + collector-code resolver.
  console.log("Importing live Yu-Gi-Oh! store prices (DexCompare engine)…");
  const imported = await importStores(prisma, dbCards as any, "yugioh").catch((e) => { console.warn("store import failed:", (e as Error).message); return { totalRows: 0 }; });
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
