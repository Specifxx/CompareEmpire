// JB Hi-Fi camera catalogue importer.
//
// JB Hi-Fi runs on Shopify, so its catalogue is reachable through the public
// `/collections/<handle>/products.json` feed. This script crawls the camera
// collection(s), turns each real product into a camera record (name, brand,
// category, best-effort specs, JB Hi-Fi's own product photo, price and the exact
// product-page link), and writes them as the live catalogue + a "JB Hi-Fi"
// retailer price. It is the source of truth for cameras; the static prisma/seed.ts
// list is only an offline fallback for when this crawl can't run (e.g. the dev
// sandbox blocks outbound network — this runs in CI/deploy where it's open).
//
//   npx tsx scripts/import-jbhifi.ts
//
// Designed to be idempotent and safe: on a successful crawl it replaces the
// catalogue with what JB currently sells; on a failed/empty crawl it changes
// nothing, so the fallback catalogue stays intact.
import { PrismaClient } from "@prisma/client";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();

const BASE = "https://www.jbhifi.com.au";
const RETAILER_KEY = "jbhifi";
const RETAILER_NAME = "JB Hi-Fi";

// AUD is the source price; derive USD/GBP for the other market modes (rough FX —
// real US/UK prices arrive when those retailers are imported). Mirrors seed.ts.
const AUD_TO_USD = 1 / 1.55;
const USD_TO_GBP = 0.9;

// Camera collection(s) to crawl. The parent "cameras" smart-collection holds the
// whole range; brand/type collections add category hints. products.json paginates.
const COLLECTIONS = ["cameras"];

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

interface ShopifyVariant { id: number; title: string; price: string; available: boolean; sku?: string }
interface ShopifyImage { src: string }
interface ShopifyProduct {
  id: number; title: string; handle: string; body_html?: string; vendor?: string;
  product_type?: string; tags?: string[] | string; variants: ShopifyVariant[]; images: ShopifyImage[];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) {
      console.warn(`  ${r.status} ${url}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn(`  fetch failed ${url}: ${(e as Error).message}`);
    return null;
  }
}

// Pull every product from a collection's products.json, page by page.
async function crawlCollection(handle: string): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  for (let page = 1; page <= 40; page++) {
    const data = await fetchJson(`${BASE}/collections/${handle}/products.json?limit=250&page=${page}`);
    const products: ShopifyProduct[] = data?.products ?? [];
    if (!products.length) break;
    out.push(...products);
    if (products.length < 250) break;
    await new Promise((r) => setTimeout(r, 250)); // be polite
  }
  return out;
}

// Accessories / non-camera items that can appear in a camera collection.
const ACCESSORY =
  /\b(lens(es)?|bag|case|tripod|monopod|gimbal stabili|memory|sd ?card|microsd|cfexpress|battery|charger|strap|filter|cage|microphone|\bmic\b|backpack|cleaning|adapter|mount|lens cap|body cap|hood|grip|remote|flash|speedlite|teleconverter|card reader|hard ?drive|\bssd\b|softbox|light(ing)? kit|stand|clamp|cable|dock|screen protector|power bank|drone(?! camera)|gift card|warranty|insurance)\b/i;

const BRAND_CODE: Record<string, string> = {
  sony: "SONY", canon: "CANON", nikon: "NIKON", fujifilm: "FUJI", fuji: "FUJI",
  panasonic: "PANA", "panasonic lumix": "PANA", lumix: "PANA", "om system": "OM",
  "om digital solutions": "OM", olympus: "OM", leica: "LEICA", hasselblad: "HASS",
  gopro: "GOPRO", dji: "DJI", sigma: "SIGMA", ricoh: "RICOH", pentax: "RICOH",
};
function brandOf(vendor: string): { code: string; name: string } {
  const v = (vendor || "").trim();
  const code = BRAND_CODE[v.toLowerCase()] ?? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "OTHER";
  return { code, name: v || "Camera" };
}

// Map JB's product type / wording onto the app's fixed CARD_TYPES set so the
// category filter keeps working.
function categoryOf(text: string): string {
  const t = text.toLowerCase();
  if (/cinema|cine camera|\bfx\d|video camera/.test(t)) return "Cinema";
  if (/action cam|\bgopro\b|osmo action|\b360\b|insta360/.test(t)) return "Action";
  if (/mirrorless/.test(t)) return "Mirrorless";
  if (/\bdslr\b|digital slr/.test(t)) return "DSLR";
  // instant, instax, compact, point & shoot, vlog, pocket, bridge, superzoom…
  return "Compact";
}

const SENSORS: [RegExp, string][] = [
  [/full[\s-]?frame/i, "Full Frame"],
  [/aps[\s-]?c/i, "APS-C"],
  [/micro\s*(four\s*thirds|4\/3)|\bm4\/3\b|\bmft\b/i, "Micro 4/3"],
  [/medium\s*format/i, "Medium Format"],
  [/1[\.\-]?\s*inch|1["”]\s*type|type\s*1\.0|\b1"\b/i, "1-inch"],
];
function sensorOf(text: string): string {
  for (const [re, val] of SENSORS) if (re.test(text)) return val;
  return "Other";
}
function mpOf(text: string): number | null {
  const m = text.match(/(\d{1,3}(?:\.\d)?)\s*(?:mp\b|megapixel|effective\s*pixel)/i);
  if (!m) return null;
  const n = Math.round(parseFloat(m[1]));
  return n > 0 && n < 400 ? n : null;
}
// Tier from price band (AUD), matching the app's RARITY keys.
function tierOf(aud: number): string {
  if (aud >= 6000) return "Flagship";
  if (aud >= 3000) return "Professional";
  if (aud >= 1200) return "Enthusiast";
  return "Entry";
}

// Cheapest available variant (fall back to cheapest overall); returns AUD cents.
function priceOf(p: ShopifyProduct): { cents: number; inStock: boolean } | null {
  const valid = p.variants.filter((v) => parseFloat(v.price) > 0);
  if (!valid.length) return null;
  const avail = valid.filter((v) => v.available);
  const pool = avail.length ? avail : valid;
  const cents = Math.min(...pool.map((v) => Math.round(parseFloat(v.price) * 100)));
  return { cents, inStock: avail.length > 0 };
}

function tagsToText(tags: ShopifyProduct["tags"]): string {
  return Array.isArray(tags) ? tags.join(" ") : tags ?? "";
}
function stripHtml(s = ""): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  console.log(`Crawling JB Hi-Fi cameras from ${BASE} …`);
  const seen = new Map<number, ShopifyProduct>();
  for (const h of COLLECTIONS) {
    const products = await crawlCollection(h);
    console.log(`  collection ${h}: ${products.length} products`);
    for (const p of products) seen.set(p.id, p);
  }
  const all = [...seen.values()];
  if (!all.length) {
    console.warn("No products returned (endpoint blocked or empty) — leaving the existing catalogue untouched.");
    return;
  }

  const runExternalIds: string[] = [];
  let created = 0;
  for (const p of all) {
    const price = priceOf(p);
    if (!price) continue; // no price — skip
    const blob = `${p.title} ${stripHtml(p.body_html)} ${tagsToText(p.tags)} ${p.product_type ?? ""}`;
    if (ACCESSORY.test(`${p.title} ${p.product_type ?? ""}`)) continue; // not a camera body

    const { code, name: brandName } = brandOf(p.vendor ?? "");
    const aud = price.cents;
    const usd = Math.round(aud * AUD_TO_USD);
    const gbp = Math.round(usd * USD_TO_GBP);
    const mp = mpOf(blob);
    const sensor = sensorOf(blob);
    const category = categoryOf(`${p.product_type ?? ""} ${tagsToText(p.tags)} ${p.title}`);
    const externalId = `jbhifi-${p.handle}`;
    const image = p.images?.[0]?.src ?? null;
    const model = (p.variants?.[0]?.sku || p.handle).toUpperCase().slice(0, 40);
    const url = `${BASE}/products/${p.handle}`;
    runExternalIds.push(externalId);

    const data = {
      name: p.title,
      nameNormalized: normalizeSearch(p.title),
      setCode: code,
      setName: brandName,
      collectorNumber: model,
      domain: sensor,
      type: category,
      rarity: tierOf(aud),
      might: mp, // megapixels
      tags: [mp ? `${mp}MP` : null, sensor !== "Other" ? sensor : null].filter(Boolean).join(", ") || null,
      description: stripHtml(p.body_html).slice(0, 400) || null,
      imageUrl: image,
      imageThumbUrl: image,
      marketPriceCents: usd,
      lowestPriceCents: aud,
      lowestPriceCentsUs: usd,
      lowestPriceCentsNz: gbp, // GBP lives in the Nz column (see country.ts)
    };

    const card = await prisma.card.upsert({
      where: { externalId },
      create: { externalId, slug: p.handle.slice(0, 80), ...data, artSeed: p.id % 1_000_000 },
      update: data,
    });

    // Single real JB Hi-Fi retailer row per camera (replace, not accumulate).
    await prisma.retailerPrice.deleteMany({ where: { cardId: card.id, retailer: RETAILER_KEY } });
    await prisma.retailerPrice.create({
      data: {
        cardId: card.id, retailer: RETAILER_KEY, retailerName: RETAILER_NAME,
        title: p.title, url, priceCents: aud, currency: "AUD", inStock: price.inStock, country: "AU",
      },
    });
    created++;
  }
  console.log(`Imported ${created} cameras from JB Hi-Fi.`);

  // Safety: only let the crawl REPLACE the catalogue when it clearly succeeded
  // (a healthy product count). A partial/blocked crawl must never wipe the existing
  // catalogue — it just adds/updates what it found.
  if (created < 20) {
    console.warn(`Only ${created} cameras imported — too few to safely replace the catalogue; left existing rows in place.`);
    console.log("JB Hi-Fi import complete (additive) ✔");
    return;
  }

  // Make the catalogue dynamic: drop anything not in this run (delisted products +
  // the static fallback placeholders), so the live catalogue == JB's current range.
  const stale = await prisma.card.findMany({
    where: { externalId: { notIn: runExternalIds } },
    select: { id: true },
  });
  if (stale.length) {
    const ids = stale.map((c) => c.id);
    await prisma.retailerPrice.deleteMany({ where: { cardId: { in: ids } } });
    await prisma.card.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed ${stale.length} stale/fallback cameras (not in the current JB range).`);
  }
  console.log("JB Hi-Fi import complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
