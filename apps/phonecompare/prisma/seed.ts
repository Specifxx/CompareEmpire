import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PHONES } from "./phones";
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

const USD_TO_AUD = 1.55;
const USD_TO_GBP = 0.92;

async function main() {
  console.log(`Loaded ${PHONES.length} phones.`);
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
    data: { email: "demo@phonecompare.com", passwordHash, displayName: "TechFan", balanceCents: 0, isAdmin: true },
  });
  console.log("Created demo account: demo@phonecompare.com / password123");

  let images: Record<string, string> = {};
  try {
    images = JSON.parse(readFileSync(join(process.cwd(), "prisma", "phone-images.json"), "utf8"));
    console.log(`Loaded ${Object.keys(images).length} phone images.`);
  } catch {
    console.warn("phone-images.json not found — run scripts/fetch-phone-images.ts. Using placeholders.");
  }

  const cardRows = PHONES.map((p) => {
    const key = `${p.brand}-${p.model}`.toLowerCase();
    const img = images[key] ?? null;
    const usLow = cents(p.baseUsd * 100 * between(0.9, 1.0));
    const auLow = cents(usLow * USD_TO_AUD * between(0.98, 1.08));
    const gbLow = cents(usLow * USD_TO_GBP * between(0.98, 1.08));
    return {
      externalId: `${p.brand}-${p.model}`.toLowerCase(),
      slug: `${p.brand}-${p.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: p.name,
      nameNormalized: normalizeSearch(p.name),
      setCode: p.brand,
      setName: p.name.split(" ")[0],
      collectorNumber: `${p.year}`,
      domain: p.form,
      type: p.os,
      rarity: p.tier,
      might: p.ram, // reuse `might` to surface RAM (GB)
      tags: `${p.year}, ${p.os}, ${p.form}, ${p.ram}GB RAM`,
      description: `${p.name} — ${p.form}, ${p.os}, ${p.ram}GB RAM (${p.year}).`,
      imageUrl: img,
      imageThumbUrl: img,
      marketPriceCents: usLow,
      lowestPriceCents: auLow,
      lowestPriceCentsNz: gbLow, // UK price lives in the Nz column (see country.ts)
      lowestPriceCentsUs: usLow,
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });
  await prisma.card.createMany({ data: cardRows, skipDuplicates: true });
  console.log(`Created ${cardRows.length} phones.`);

  const dbCards = await prisma.card.findMany({
    select: { id: true, externalId: true, name: true, lowestPriceCentsUs: true, lowestPriceCents: true, lowestPriceCentsNz: true },
  });

  const auRetailers = [
    { key: "jbhifi", name: "JB Hi-Fi", url: (q: string) => `https://www.jbhifi.com.au/search?query=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "officeworks", name: "Officeworks", url: (q: string) => `https://www.officeworks.com.au/shop/officeworks/search?q=${q}`, spread: [0.98, 1.06] as [number, number] },
    { key: "amazon_au", name: "Amazon AU", url: (q: string) => `https://www.amazon.com.au/s?k=${q}`, spread: [0.95, 1.1] as [number, number] },
    { key: "mobileciti", name: "Mobileciti", url: (q: string) => `https://www.mobileciti.com.au/catalogsearch/result/?q=${q}`, spread: [0.96, 1.05] as [number, number] },
    { key: "kogan", name: "Kogan", url: (q: string) => `https://www.kogan.com/au/shop/?q=${q}`, spread: [0.95, 1.08] as [number, number] },
  ];
  const usRetailers = [
    { key: "bestbuy", name: "Best Buy", url: (q: string) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`, spread: [0.97, 1.04] as [number, number] },
    { key: "amazon_us", name: "Amazon US", url: (q: string) => `https://www.amazon.com/s?k=${q}`, spread: [0.95, 1.1] as [number, number] },
    { key: "bhphoto", name: "B&H Photo", url: (q: string) => `https://www.bhphotovideo.com/c/search?q=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "walmart", name: "Walmart", url: (q: string) => `https://www.walmart.com/search?q=${q}`, spread: [0.96, 1.07] as [number, number] },
  ];
  const gbRetailers = [
    { key: "currys", name: "Currys", url: (q: string) => `https://www.currys.co.uk/search?q=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "amazon_uk", name: "Amazon UK", url: (q: string) => `https://www.amazon.co.uk/s?k=${q}`, spread: [0.95, 1.1] as [number, number] },
    { key: "johnlewis", name: "John Lewis", url: (q: string) => `https://www.johnlewis.com/search?search-term=${q}`, spread: [0.99, 1.08] as [number, number] },
    { key: "argos", name: "Argos", url: (q: string) => `https://www.argos.co.uk/search/${q}/`, spread: [0.98, 1.07] as [number, number] },
  ];

  const rows: {
    cardId: string; retailer: string; retailerName: string; title: string; url: string;
    priceCents: number; currency: string; inStock: boolean; country: string;
  }[] = [];
  for (const c of dbCards) {
    const q = encodeURIComponent(c.name);
    for (const r of auRetailers)
      rows.push({ cardId: c.id, retailer: r.key, retailerName: r.name, title: c.name, url: r.url(q), priceCents: cents((c.lowestPriceCents ?? 0) * between(r.spread[0], r.spread[1])), currency: "AUD", inStock: true, country: "AU" });
    for (const r of usRetailers)
      rows.push({ cardId: c.id, retailer: r.key, retailerName: r.name, title: c.name, url: r.url(q), priceCents: cents((c.lowestPriceCentsUs ?? 0) * between(r.spread[0], r.spread[1])), currency: "USD", inStock: true, country: "US" });
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
