// Multi-retailer camera catalogue importer (Shopify stores).
//
// Many camera retailers run on Shopify, exposing their catalogue via the public
// `/collections/<handle>/products.json` feed. This script crawls a configured list
// of Shopify camera stores, turns each real product into a camera record, and —
// crucially — MATCHES the same model across stores onto ONE camera so the product
// page can compare every store's real price + in-stock + product link side by side.
//
//   npx tsx scripts/import-cameras.ts
//
// It is the live source of truth for cameras; prisma/seed.ts is only an offline
// fallback. The crawl needs open network (CI/deploy) — the dev sandbox blocks it,
// in which case nothing is fetched and the existing catalogue is left untouched.
//
// Adding a store = one entry in RETAILERS below. Non-Shopify stores (Magento /
// NetSuite / custom — e.g. digiDirect, CameraPro, B&H, Adorama, Wex) don't serve
// products.json and are skipped gracefully; they'd need bespoke importers.
import { PrismaClient } from "@prisma/client";
import { normalizeSearch } from "../src/lib/format";

const prisma = new PrismaClient();

// AUD is the base for AU stores; derive USD/GBP for those market modes when no real
// US/UK retailer prices a model yet. Mirrors seed.ts.
const AUD_TO_USD = 1 / 1.55;
const USD_TO_GBP = 0.9;

interface Retailer {
  key: string; name: string; base: string;
  country: "AU" | "US" | "GB"; currency: string; collections: string[];
}
// Confirmed + candidate Shopify camera stores. Candidates that aren't actually
// Shopify simply return no products and are skipped.
const RETAILERS: Retailer[] = [
  { key: "jbhifi", name: "JB Hi-Fi", base: "https://www.jbhifi.com.au", country: "AU", currency: "AUD", collections: ["cameras"] },
  { key: "teds", name: "Ted's Cameras", base: "https://www.teds.com.au", country: "AU", currency: "AUD", collections: ["cameras", "digital-cameras", "mirrorless-cameras", "dslr-cameras", "compact-cameras"] },
  { key: "georges", name: "Georges Cameras", base: "https://www.georges.com.au", country: "AU", currency: "AUD", collections: ["cameras", "digital-cameras", "mirrorless-cameras"] },
  { key: "camerahouse", name: "Camera House", base: "https://www.camerahouse.com.au", country: "AU", currency: "AUD", collections: ["cameras", "digital-cameras"] },
];
const RETAILER_KEYS = RETAILERS.map((r) => r.key);

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

interface ShopifyVariant { id: number; price: string; available: boolean; sku?: string }
interface ShopifyImage { src: string }
interface ShopifyProduct {
  id: number; title: string; handle: string; body_html?: string; vendor?: string;
  product_type?: string; tags?: string[] | string; variants: ShopifyVariant[]; images: ShopifyImage[];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!/json/i.test(ct)) return null; // not a Shopify JSON feed
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: UA });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

// Camera collection handles worth crawling vs. accessory collections to ignore.
const COLL_CAMERA = /camera|mirrorless|dslr|compact|instant|action|vlog|cinema/i;
const COLL_SKIP = /accessor|lens(?!.*camera)|bag|tripod|memory|sd-?card|battery|charger|strap|filter|cleaning|print|paper|ink|sale|clearance|gift|used|second-?hand|trade/i;

// Auto-discover a Shopify store's camera collections from its sitemap, so we don't
// rely on guessed handles. Returns [] for non-Shopify stores (no collections sitemap).
async function discoverCollections(base: string): Promise<string[]> {
  const handles = new Set<string>();
  const index = await fetchText(`${base}/sitemap.xml`);
  let sitemaps = index
    ? [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /sitemap_collections/i.test(u))
    : [];
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];
  for (const sm of sitemaps.slice(0, 8)) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    for (const m of xml.matchAll(/\/collections\/([a-z0-9][a-z0-9-]*)/gi)) {
      const h = m[1].toLowerCase();
      if (COLL_CAMERA.test(h) && !COLL_SKIP.test(h)) handles.add(h);
    }
  }
  return [...handles];
}

async function crawl(base: string, handle: string): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  for (let page = 1; page <= 40; page++) {
    const data = await fetchJson(`${base}/collections/${handle}/products.json?limit=250&page=${page}`);
    const products: ShopifyProduct[] = data?.products ?? [];
    if (!products.length) break;
    out.push(...products);
    if (products.length < 250) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

const ACCESSORY =
  /\b(lens(es)?|bag|case|tripod|monopod|gimbal stabili|memory|sd ?card|microsd|cfexpress|battery|charger|strap|filter|cage|microphone|\bmic\b|backpack|cleaning|adapter|mount|lens cap|body cap|hood|grip|remote|flash|speedlite|teleconverter|card reader|hard ?drive|\bssd\b|softbox|light(ing)? kit|stand|clamp|cable|dock|screen protector|power bank|gift card|warranty|insurance|voucher)\b/i;

const BRAND_CODE: Record<string, string> = {
  sony: "SONY", canon: "CANON", nikon: "NIKON", fujifilm: "FUJI", fuji: "FUJI",
  panasonic: "PANA", "panasonic lumix": "PANA", lumix: "PANA", "om system": "OM",
  "om digital solutions": "OM", olympus: "OM", leica: "LEICA", hasselblad: "HASS",
  gopro: "GOPRO", dji: "DJI", sigma: "SIGMA", ricoh: "RICOH", pentax: "RICOH", insta360: "INSTA360",
};
const BRAND_WORDS: Record<string, string[]> = {
  SONY: ["sony", "cyber-shot", "cybershot"], CANON: ["canon", "eos", "powershot"],
  NIKON: ["nikon", "coolpix"], FUJI: ["fujifilm", "fuji"], PANA: ["panasonic", "lumix"],
  OM: ["om system", "om digital solutions", "olympus"], LEICA: ["leica"], HASS: ["hasselblad"],
  GOPRO: ["gopro"], DJI: ["dji"], SIGMA: ["sigma"], RICOH: ["ricoh", "pentax"], INSTA360: ["insta360"],
};
function brandOf(vendor: string, title: string): { code: string; name: string } {
  const v = (vendor || "").trim();
  let code = BRAND_CODE[v.toLowerCase()];
  if (!code) {
    // fall back to detecting the brand from the title
    const tl = title.toLowerCase();
    for (const [name, c] of Object.entries(BRAND_CODE)) if (tl.includes(name)) { code = c; break; }
  }
  code = code ?? (v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "OTHER");
  return { code, name: v || code };
}

// Canonical model key so the SAME camera matches across stores (validated against
// real cross-store title variants). Keeps kit/combo/creator as distinct variants so
// a kit's price never merges onto the body-only listing.
const ROMAN: Record<string, number> = { ii: 2, iii: 3, iv: 4, vi: 6, vii: 7, viii: 8, ix: 9 };
function variantTag(t: string): string {
  if (/\bcreator\b/.test(t)) return "creator";
  if (/\bcombo\b/.test(t)) return "combo";
  if (/\b(twin|two[\s-]?lens|2[\s-]?lens|double)\b/.test(t)) return "twinkit";
  if (/\b(kit|bundle|with lens)\b/.test(t)) return "kit";
  return "";
}
function canonKey(brandCode: string, title: string): string {
  let t = " " + title.toLowerCase() + " ";
  t = t.replace(/[‘’“”]/g, "").replace(/α/g, "a");
  t = t.replace(/\balpha\s*a?\s*/g, "a");
  t = t.replace(/[()\[\]]/g, " ");
  const v = variantTag(t);
  for (const w of BRAND_WORDS[brandCode] ?? [brandCode.toLowerCase()]) t = t.replace(new RegExp(`\\b${w}\\b`, "g"), " ");
  t = t.replace(/\b\d\s*-?\s*axis\b/g, " ");
  t = t.replace(/\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s*mm/g, " ").replace(/\d+\s*mm/g, " ").replace(/f\/?\d+(\.\d+)?/g, " ");
  t = t.replace(/\b(4k|5k|6k|8k|uhd|fhd|hd|fps|wifi|wi-fi|bluetooth)\b/g, " ");
  t = t.replace(
    /\b(black|silver|white|graphite|grey|gray|blue|red|gold|titanium|charcoal|body|only|kit|bundle|combo|creator|twin|lens|camera|cameras|mirrorless|dslr|digital|compact|vlogging|vlog|gimbal|handheld|stabilised|stabilized|stabiliser|action|cam|the|new|genuine|au|aus|australian|stock|warranty|with|incl|including|inc|brand|pack)\b/g,
    " "
  );
  t = t.replace(/\bmark\b/g, " ");
  t = t.replace(/\b([ivx]{2,4})\b/g, (m, r) => (ROMAN[r] ? String(ROMAN[r]) : m));
  let core = t.replace(/[^a-z0-9]+/g, "");
  core = core.replace(/(\d)m(\d)/g, "$1$2");
  return `${brandCode}:${core}${v ? "+" + v : ""}`;
}

function categoryOf(text: string): string {
  const t = text.toLowerCase();
  if (/cinema|cine camera|\bfx\d|video camera/.test(t)) return "Cinema";
  if (/action cam|\bgopro\b|osmo action|\b360\b|insta360/.test(t)) return "Action";
  if (/mirrorless/.test(t)) return "Mirrorless";
  if (/\bdslr\b|digital slr/.test(t)) return "DSLR";
  return "Compact";
}
const SENSORS: [RegExp, string][] = [
  [/full[\s-]?frame/i, "Full Frame"], [/aps[\s-]?c/i, "APS-C"],
  [/micro\s*(four\s*thirds|4\/3)|\bm4\/3\b|\bmft\b/i, "Micro 4/3"],
  [/medium\s*format/i, "Medium Format"], [/1[\.\-]?\s*inch|1["”]\s*type|type\s*1\.0|\b1"\b/i, "1-inch"],
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
function tierOf(aud: number): string {
  if (aud >= 6000) return "Flagship";
  if (aud >= 3000) return "Professional";
  if (aud >= 1200) return "Enthusiast";
  return "Entry";
}
function priceOf(p: ShopifyProduct): { cents: number; inStock: boolean } | null {
  const valid = p.variants.filter((v) => parseFloat(v.price) > 0);
  if (!valid.length) return null;
  const avail = valid.filter((v) => v.available);
  const pool = avail.length ? avail : valid;
  return { cents: Math.min(...pool.map((v) => Math.round(parseFloat(v.price) * 100))), inStock: avail.length > 0 };
}
const tagsText = (t: ShopifyProduct["tags"]) => (Array.isArray(t) ? t.join(" ") : t ?? "");
const stripHtml = (s = "") => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

interface Listing {
  retailer: Retailer; priceCents: number; inStock: boolean; url: string; image: string | null;
  title: string; brandCode: string; brandName: string; mp: number | null; sensor: string;
  category: string; sku: string; id: number;
}

async function main() {
  // 1. Crawl every store.
  const byKey = new Map<string, Listing[]>();
  for (const r of RETAILERS) {
    const seen = new Map<number, ShopifyProduct>();
    const discovered = await discoverCollections(r.base);
    const handles = [...new Set([...discovered, ...r.collections])];
    for (const h of handles) for (const p of await crawl(r.base, h)) seen.set(p.id, p);
    let kept = 0;
    for (const p of seen.values()) {
      if (ACCESSORY.test(`${p.title} ${p.product_type ?? ""}`)) continue;
      const price = priceOf(p);
      if (!price) continue;
      const { code, name } = brandOf(p.vendor ?? "", p.title);
      const blob = `${p.title} ${stripHtml(p.body_html)} ${tagsText(p.tags)} ${p.product_type ?? ""}`;
      const key = canonKey(code, p.title);
      const listing: Listing = {
        retailer: r, priceCents: price.cents, inStock: price.inStock,
        url: `${r.base}/products/${p.handle}`, image: p.images?.[0]?.src ?? null, title: p.title,
        brandCode: code, brandName: name, mp: mpOf(blob), sensor: sensorOf(blob),
        category: categoryOf(`${p.product_type ?? ""} ${tagsText(p.tags)} ${p.title}`),
        sku: (p.variants?.[0]?.sku || p.handle).toUpperCase().slice(0, 40), id: p.id,
      };
      (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(listing);
      kept++;
    }
    console.log(`${r.name}: ${kept} cameras`);
  }
  if (!byKey.size) {
    console.warn("No products from any store (endpoints blocked) — leaving catalogue untouched.");
    return;
  }

  // 2. One camera per canonical key; attach every store's real price.
  const runExternalIds: string[] = [];
  let created = 0;
  for (const [key, listings] of byKey) {
    // Representative for the display fields: prefer JB Hi-Fi (clean photos), then any
    // with an image; best specs come from whichever listing has them.
    const order = (l: Listing) => (l.retailer.key === "jbhifi" ? 0 : l.image ? 1 : 2);
    const rep = [...listings].sort((a, b) => order(a) - order(b))[0];
    const image = listings.find((l) => l.retailer.key === "jbhifi" && l.image)?.image ?? listings.find((l) => l.image)?.image ?? null;
    const mp = listings.map((l) => l.mp).find((x) => x != null) ?? null;
    const sensor = listings.map((l) => l.sensor).find((s) => s !== "Other") ?? "Other";

    const auPrices = listings.filter((l) => l.retailer.country === "AU").map((l) => l.priceCents);
    const usPrices = listings.filter((l) => l.retailer.country === "US").map((l) => l.priceCents);
    const gbPrices = listings.filter((l) => l.retailer.country === "GB").map((l) => l.priceCents);
    const au = auPrices.length ? Math.min(...auPrices) : null;
    const usReal = usPrices.length ? Math.min(...usPrices) : null;
    const gbReal = gbPrices.length ? Math.min(...gbPrices) : null;
    const usd = usReal ?? (au != null ? Math.round(au * AUD_TO_USD) : null);
    const gbp = gbReal ?? (usd != null ? Math.round(usd * USD_TO_GBP) : null);
    const tierBase = au ?? (usd != null ? Math.round(usd / AUD_TO_USD) : 0);

    const externalId = `cam-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 80);
    runExternalIds.push(externalId);
    const data = {
      name: rep.title, nameNormalized: normalizeSearch(rep.title),
      setCode: rep.brandCode, setName: rep.brandName, collectorNumber: rep.sku,
      domain: sensor, type: rep.category, rarity: tierOf(tierBase), might: mp,
      tags: [mp ? `${mp}MP` : null, sensor !== "Other" ? sensor : null].filter(Boolean).join(", ") || null,
      imageUrl: image, imageThumbUrl: image,
      marketPriceCents: usd ?? 0, lowestPriceCents: au, lowestPriceCentsUs: usd, lowestPriceCentsNz: gbp,
    };
    const card = await prisma.card.upsert({
      where: { externalId },
      create: { externalId, slug: externalId.replace(/^cam-/, "").slice(0, 80), ...data, artSeed: rep.id % 1_000_000 },
      update: data,
    });

    // Replace this card's rows for the stores we manage, then add one per store.
    await prisma.retailerPrice.deleteMany({ where: { cardId: card.id, retailer: { in: RETAILER_KEYS } } });
    await prisma.retailerPrice.createMany({
      data: listings.map((l) => ({
        cardId: card.id, retailer: l.retailer.key, retailerName: l.retailer.name,
        title: l.title, url: l.url, priceCents: l.priceCents, currency: l.retailer.currency,
        inStock: l.inStock, country: l.retailer.country,
      })),
    });
    created++;
  }
  console.log(`Imported ${created} cameras across ${RETAILERS.length} stores.`);

  // 3. Dynamic catalogue — only when the crawl clearly succeeded.
  if (created < 20) {
    console.warn(`Only ${created} cameras — too few to replace the catalogue safely; left existing rows in place.`);
    return;
  }
  const stale = await prisma.card.findMany({ where: { externalId: { notIn: runExternalIds } }, select: { id: true } });
  if (stale.length) {
    const ids = stale.map((c) => c.id);
    await prisma.retailerPrice.deleteMany({ where: { cardId: { in: ids } } });
    await prisma.card.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed ${stale.length} stale/fallback cameras.`);
  }
  console.log("Camera import complete ✔");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
