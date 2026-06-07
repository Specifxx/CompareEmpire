import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CAMERAS } from "./cameras";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();

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
const cents = (n: number) => Math.max(100, Math.round(n));

// USD → local. UK prices include VAT, so the GBP figure sits relatively high.
const USD_TO_AUD = 1.55;
const USD_TO_GBP = 0.9;

async function main() {
  console.log(`Loaded ${CAMERAS.length} cameras.`);
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
    data: { email: "demo@cameracompare.com", passwordHash, displayName: "ShutterFan", balanceCents: 0, isAdmin: true },
  });
  console.log("Created demo account: demo@cameracompare.com / password123");

  const cardRows = CAMERAS.map((c) => {
    const usLow = cents(c.baseUsd * 100 * between(0.92, 1.0));
    const auLow = cents(usLow * USD_TO_AUD * between(0.98, 1.08));
    const gbLow = cents(usLow * USD_TO_GBP * between(0.98, 1.08));
    return {
      externalId: `${c.brand}-${c.model}`.toLowerCase(),
      slug: `${c.brand}-${c.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: c.name,
      nameNormalized: normalizeSearch(c.name),
      setCode: c.brand,
      setName: c.brand,
      collectorNumber: c.model,
      domain: c.sensor,
      type: c.category,
      rarity: c.tier,
      might: c.mp, // reuse `might` to surface megapixels
      tags: `${c.year}, ${c.mp}MP, ${c.sensor}`,
      description: `${c.name} — ${c.mp}MP ${c.sensor} ${c.category.toLowerCase()} (${c.year}).`,
      marketPriceCents: usLow,
      lowestPriceCents: auLow,
      lowestPriceCentsNz: gbLow, // UK price lives in the Nz column (see country.ts)
      lowestPriceCentsUs: usLow,
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });
  await prisma.card.createMany({ data: cardRows, skipDuplicates: true });
  console.log(`Created ${cardRows.length} cameras.`);

  const dbCards = await prisma.card.findMany({
    select: { id: true, externalId: true, name: true, lowestPriceCentsUs: true, lowestPriceCents: true, lowestPriceCentsNz: true },
  });

  const usRetailers = [
    { key: "bhphoto", name: "B&H Photo", url: (q: string) => `https://www.bhphotovideo.com/c/search?q=${q}`, spread: [0.97, 1.03] as [number, number] },
    { key: "adorama", name: "Adorama", url: (q: string) => `https://www.adorama.com/l/?searchinfo=${q}`, spread: [0.98, 1.05] as [number, number] },
    { key: "amazon_us", name: "Amazon US", url: (q: string) => `https://www.amazon.com/s?k=${q}`, spread: [0.95, 1.12] as [number, number] },
  ];
  const auRetailers = [
    { key: "digidirect", name: "digiDirect", url: (q: string) => `https://www.digidirect.com.au/search?q=${q}`, spread: [0.98, 1.05] as [number, number] },
    { key: "jbhifi", name: "JB Hi-Fi", url: (q: string) => `https://www.jbhifi.com.au/search?query=${q}`, spread: [0.99, 1.08] as [number, number] },
    { key: "teds", name: "Ted's Cameras", url: (q: string) => `https://www.teds.com.au/catalogsearch/result/?q=${q}`, spread: [1.0, 1.1] as [number, number] },
  ];
  const gbRetailers = [
    { key: "wex", name: "Wex Photo Video", url: (q: string) => `https://www.wexphotovideo.com/search/?searchterm=${q}`, spread: [0.98, 1.05] as [number, number] },
    { key: "parkcameras", name: "Park Cameras", url: (q: string) => `https://www.parkcameras.com/search?q=${q}`, spread: [0.99, 1.07] as [number, number] },
    { key: "amazon_uk", name: "Amazon UK", url: (q: string) => `https://www.amazon.co.uk/s?k=${q}`, spread: [0.96, 1.12] as [number, number] },
  ];

  const rows: {
    cardId: string; retailer: string; retailerName: string; title: string; url: string;
    priceCents: number; currency: string; inStock: boolean; country: string;
  }[] = [];
  for (const c of dbCards) {
    const q = encodeURIComponent(c.name);
    for (const r of usRetailers)
      rows.push({ cardId: c.id, retailer: r.key, retailerName: r.name, title: c.name, url: r.url(q), priceCents: cents((c.lowestPriceCentsUs ?? 0) * between(r.spread[0], r.spread[1])), currency: "USD", inStock: true, country: "US" });
    for (const r of auRetailers)
      rows.push({ cardId: c.id, retailer: r.key, retailerName: r.name, title: c.name, url: r.url(q), priceCents: cents((c.lowestPriceCents ?? 0) * between(r.spread[0], r.spread[1])), currency: "AUD", inStock: true, country: "AU" });
    for (const r of gbRetailers)
      rows.push({ cardId: c.id, retailer: r.key, retailerName: r.name, title: c.name, url: r.url(q), priceCents: cents((c.lowestPriceCentsNz ?? 0) * between(r.spread[0], r.spread[1])), currency: "GBP", inStock: true, country: "GB" });
  }
  await prisma.retailerPrice.createMany({ data: rows, skipDuplicates: true });
  console.log(`Created ${rows.length} retailer prices across AU/US/UK.`);
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
