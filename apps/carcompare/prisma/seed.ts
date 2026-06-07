import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VEHICLES } from "./vehicles";
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

// Base prices are AUD drive-away. Convert to other markets.
const AUD_TO_USD = 1 / 1.55;
const AUD_TO_GBP = 1 / 1.92;

async function main() {
  console.log(`Loaded ${VEHICLES.length} vehicles.`);
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
    data: { email: "demo@carcompare.com", passwordHash, displayName: "GearHead", balanceCents: 0, isAdmin: true },
  });
  console.log("Created demo account: demo@carcompare.com / password123");

  // Real vehicle photos fetched in CI (scripts/fetch-car-images.ts). Optional.
  let images: Record<string, string> = {};
  try {
    images = JSON.parse(readFileSync(join(process.cwd(), "prisma", "car-images.json"), "utf8"));
    console.log(`Loaded ${Object.keys(images).length} car images.`);
  } catch {
    console.warn("car-images.json not found — run scripts/fetch-car-images.ts. Using placeholders.");
  }

  const cardRows = VEHICLES.map((v) => {
    const key = `${v.make}-${v.model}`.toLowerCase();
    const img = images[key] ?? null;
    const auLow = cents(v.baseAud * 100 * between(0.97, 1.0)); // best AU drive-away
    const usLow = cents(auLow * AUD_TO_USD * between(0.96, 1.06));
    const gbLow = cents(auLow * AUD_TO_GBP * between(0.96, 1.06));
    return {
      externalId: `${v.make}-${v.model}`.toLowerCase(),
      slug: `${v.make}-${v.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: v.name,
      nameNormalized: normalizeSearch(v.name),
      setCode: v.make,
      setName: v.name.split(" ")[0], // display make
      collectorNumber: `${v.year}`,
      domain: v.body,
      type: v.fuel,
      rarity: v.segment,
      might: v.powerKw, // reuse `might` to surface power (kW)
      tags: `${v.year}, ${v.fuel}, ${v.body}, ${v.powerKw}kW`,
      description: `${v.name} — ${v.body}, ${v.fuel}, ${v.powerKw}kW (${v.year}).`,
      imageUrl: img,
      imageThumbUrl: img,
      marketPriceCents: auLow,
      lowestPriceCents: auLow,
      lowestPriceCentsNz: gbLow, // UK price lives in the Nz column (see country.ts)
      lowestPriceCentsUs: usLow,
      artSeed: Math.floor(rng() * 1_000_000),
    };
  });
  await prisma.card.createMany({ data: cardRows, skipDuplicates: true });
  console.log(`Created ${cardRows.length} vehicles.`);

  const dbCards = await prisma.card.findMany({
    select: { id: true, externalId: true, name: true, lowestPriceCentsUs: true, lowestPriceCents: true, lowestPriceCentsNz: true },
  });

  // Car marketplaces / dealers per market. Model-name search lands on listings.
  const auRetailers = [
    { key: "carsales", name: "carsales", url: (q: string) => `https://www.carsales.com.au/cars/?q=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "drive", name: "Drive", url: (q: string) => `https://www.drive.com.au/cars-for-sale/search/?q=${q}`, spread: [0.98, 1.06] as [number, number] },
    { key: "carsguide", name: "CarsGuide", url: (q: string) => `https://www.carsguide.com.au/buy-a-car?q=${q}`, spread: [0.98, 1.07] as [number, number] },
    { key: "carexpert", name: "CarExpert", url: (q: string) => `https://www.carexpert.com.au/cars-for-sale?search=${q}`, spread: [0.97, 1.04] as [number, number] },
    { key: "gumtree_au", name: "Gumtree", url: (q: string) => `https://www.gumtree.com.au/s-cars-vans-utes/${q}/k0c18320`, spread: [0.92, 1.05] as [number, number] },
  ];
  const usRetailers = [
    { key: "carscom", name: "Cars.com", url: (q: string) => `https://www.cars.com/shopping/results/?keyword=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "cargurus", name: "CarGurus", url: (q: string) => `https://www.cargurus.com/Cars/instantMarketValue.action?searchId=${q}`, spread: [0.97, 1.06] as [number, number] },
    { key: "autotrader_us", name: "Autotrader", url: (q: string) => `https://www.autotrader.com/cars-for-sale/all-cars?keyword=${q}`, spread: [0.98, 1.07] as [number, number] },
    { key: "edmunds", name: "Edmunds", url: (q: string) => `https://www.edmunds.com/inventory/srp.html?search=${q}`, spread: [0.97, 1.05] as [number, number] },
  ];
  const gbRetailers = [
    { key: "autotrader_uk", name: "Auto Trader UK", url: (q: string) => `https://www.autotrader.co.uk/car-search?keywords=${q}`, spread: [0.97, 1.05] as [number, number] },
    { key: "carwow", name: "Carwow", url: (q: string) => `https://www.carwow.co.uk/search?q=${q}`, spread: [0.97, 1.04] as [number, number] },
    { key: "cinch", name: "Cinch", url: (q: string) => `https://www.cinch.co.uk/used-cars?q=${q}`, spread: [0.98, 1.06] as [number, number] },
    { key: "motors_uk", name: "Motors", url: (q: string) => `https://www.motors.co.uk/search/car/?keywords=${q}`, spread: [0.98, 1.07] as [number, number] },
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
  console.log(`Created ${rows.length} dealer/marketplace prices across AU/US/UK.`);
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
