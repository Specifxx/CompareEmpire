// Imports SEALED / non-single Pokémon products (booster boxes, elite trainer
// boxes, collection boxes, bundles, tins, packs, …) from the AU/NZ Shopify stores
// plus eBay (AU) and the TCGplayer catalogue (US/GB), into SealedListing. The
// singles importer (price-import.ts) deliberately skips these; this complements it.
import { prisma } from "./db";
import { RETAILER_LIST } from "./retailers";
import { fetchTcgplayerSealed, tcgProductUrl, tcgImageUrl } from "./tcgplayer";
import { POKEMON_SETS } from "./pokemon-sets";
import { FEATURED_RESTOCKS, restockTitleRegex } from "./restocks";

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

interface ShopifyImg { src?: string }
interface ShopifyVar { price: string; available: boolean }
interface ShopifyProd { title: string; handle: string; variants: ShopifyVar[]; images?: ShopifyImg[] }

// A sealed product must be identifiably POKÉMON. Other games slip in when a store
// files them under a shared/mismatched collection, so we require an explicit
// Pokémon marker: the word "Pokémon", or a detected Pokémon set name in the title.
const POKEMON_HINT = /pok[eé]mon|\bpkmn\b/i;

function isPokémonSealed(title: string): boolean {
  return POKEMON_HINT.test(title) || detectSetMeta(title) != null;
}

// A sealed product title looks like one of these (Pokémon sealed lines).
const SEALED_TITLE =
  /booster\s*box|booster\s*display|display\s*box|display\s*case|booster\s*bundle|booster\s*pack|\bpack\b|elite\s*trainer\s*box|\betb\b|premium\s*collection|collection\s*box|\bcollection\b|build\s*&?\s*and?\s*battle|\bbundle\b|gift\s*box|sleeved\s*booster|blister|\bcase\b|\btin\b|\bsealed\b/i;
// …but never these. Singles / accessories / graded slabs / bulk / non-English slip
// through otherwise. A collector number ("/198") is a tell-tale single-card sign.
const SEALED_EXCLUDE =
  /\bsingle\b|playmat|deck\s*box|sleeves?\b|binder|toploader|top\s*loader|dice|counter|\btoken\b|coin\b|\/\d{2,3}\b|\bpsa\b|\bcgc\b|\bbgs\b|graded|chinese|japanese|korean|simplified|traditional|\bbulk\s+(?:lot|cards|commons?|singles?)\b|\bopened\b|live\s*break|\bticket\b|\b(?:nm|lp|mp|hp|dmg)\b|near\s*mint|lightly\s*played/i;

async function fetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: { ...UA, "Cache-Control": "no-cache" }, cache: "no-store" });
    return r.ok ? await r.json() : null;
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

// Discover Pokémon collections (including sealed-only ones, which the singles
// importer skips) so we can find boxes/packs/ETBs wherever the store files them.
// We match on Pokémon-ish handles plus the generic sealed buckets (booster-boxes,
// elite-trainer-box, sealed, …) so a store that files sealed under a game-agnostic
// collection is still covered — the per-product Pokémon check happens downstream.
const COLLECTION_HINT =
  /pok[eé]mon|pkmn|booster|elite[-\s]?trainer|\betb\b|sealed|trainer[-\s]?box|collection[-\s]?box|booster[-\s]?bundle|tcg/i;
async function discoverCollections(base: string): Promise<string[]> {
  const handles = new Set<string>();
  const index = await fetchText(`${base}/sitemap.xml`);
  let sitemaps = index
    ? Array.from(index.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u) => /sitemap_collections/i.test(u))
    : [];
  if (!sitemaps.length) sitemaps = [`${base}/sitemap_collections_1.xml`];
  for (const sm of sitemaps.slice(0, 8)) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    for (const m of xml.matchAll(/\/collections\/([^<\/?#"]+)/g)) {
      const h = m[1];
      if (COLLECTION_HINT.test(h) && !/\.(jpe?g|png|gif|webp|svg)$/i.test(h)) handles.add(h);
    }
  }
  return Array.from(handles);
}

async function fetchProducts(base: string, handle: string, country: string): Promise<ShopifyProd[]> {
  const all: ShopifyProd[] = [];
  for (let page = 1; page <= 10; page++) {
    // country=XX forces the store's market price (Shopify Markets serves a different
    // price per country): AUD for AU stores, NZD for NZ stores.
    const data = await fetchJson(`${base}/collections/${handle}/products.json?limit=250&page=${page}&country=${country}&_=${Date.now()}`);
    const products: ShopifyProd[] = data?.products ?? [];
    if (!products.length) break;
    all.push(...products);
    if (products.length < 250) break;
  }
  return all;
}

// Classify a sealed product into a specific Pokémon product type. Shared by store
// scraping, eBay and the TCGplayer catalogue so the same product groups together
// across markets. Order matters: the most specific / highest-value SKUs win first.
export function classifySealed(title: string): string {
  const t = title.toLowerCase();
  // Cases first (a "booster box case" is a case of boxes, not a single box).
  if (/(?:booster\s*box|display|elite\s*trainer\s*box|etb)\s*case|\bcase\s*of\b|sealed\s*case/.test(t)) return "Booster Case";
  if (/elite\s*trainer\s*box|\betb\b/.test(t)) return "Elite Trainer Box";
  if (/booster\s*box|booster\s*display|display\s*box/.test(t)) return "Booster Box";
  if (/booster\s*bundle/.test(t)) return "Booster Bundle";
  if (/build\s*&?\s*(?:and\s*)?battle\s*(?:box|stadium)|prerelease|pre-?release/.test(t)) return "Build & Battle";
  if (/premium\s*collection|ultra[-\s]?premium|special\s*collection|collection\s*box|\bcollection\b|\bbox\b\s*set|box\s*set/.test(t)) return "Collection Box";
  if (/gift\s*box|holiday\s*calendar|advent/.test(t)) return "Gift Box";
  if (/\btin\b/.test(t)) return "Tin";
  if (/sleeved\s*booster|checklane|hanger/.test(t)) return "Sleeved Booster";
  if (/\bbundle\b/.test(t)) return "Bundle";
  if (/blister|booster\s*pack|\bpack\b/.test(t)) return "Booster Pack";
  return "Sealed";
}

// COMPUTE ONCE, AT IMPORT TIME: which featured restock tracker (if any) a sealed
// listing belongs to. The /restock pages used to read a whole market's sealed
// table per request and run these same regexes in JS; storing the answer on the
// row turns that into an indexed read of a handful of rows.
//
// The matchers are the single source of truth in src/lib/restocks.ts — imported,
// never duplicated. Compiled once per process (RegExp construction per title
// across thousands of listings is pure waste).
const FEATURED_MATCHERS: { slug: string; re: RegExp }[] = FEATURED_RESTOCKS.map((p) => ({
  slug: p.slug,
  re: restockTitleRegex(p),
}));

export function featuredRestockSlug(title: string): string | null {
  for (const m of FEATURED_MATCHERS) if (m.re.test(title)) return m.slug;
  return null;
}

// Map a TCGplayer setName to our Pokémon set code via the catalogue (null for
// cross-set products we can't place). detectSetMeta handles the fuzzy matching.
function setCodeFromSetName(setName: string): string | null {
  return detectSetMeta(setName ?? "")?.code ?? null;
}

export async function importSealed(): Promise<number> {
  let count = 0;
  for (const store of RETAILER_LIST) {
    const cc = store.country ?? "AU";
    // Auto-discover from the sitemap, but fall back to the store's configured
    // collections (some stores' sitemaps don't expose their collection handles —
    // this is why NZ sealed stores were being skipped). Mirrors price-import.ts.
    let handles = await discoverCollections(store.base);
    handles = Array.from(new Set([...handles, ...(store.collections ?? [])]));
    if (!handles.length) continue;

    const seen = new Set<string>();
    const rows = new Map<string, any>(); // groupKey+store -> row (cheapest per store/product)
    let scraped = false; // did we actually read products (vs an empty/failed fetch)?
    for (const handle of handles) {
      const products = await fetchProducts(store.base, handle, cc);
      if (products.length) scraped = true;
      for (const p of products) {
        if (seen.has(p.handle)) continue;
        seen.add(p.handle);
        const title = p.title ?? "";
        if (!SEALED_TITLE.test(title) || SEALED_EXCLUDE.test(title)) continue;
        if (!isPokémonSealed(title)) continue; // drop non-Pokémon + unreleased sets
        const priced = p.variants.filter((v) => parseFloat(v.price) > 0);
        if (!priced.length) continue;
        const avail = priced.filter((v) => v.available);
        const inStock = avail.length > 0;
        const pool = inStock ? avail : priced;
        const priceCents = Math.round(Math.min(...pool.map((v) => parseFloat(v.price))) * 100);
        const setCode = detectSetMeta(title)?.code ?? null;
        const type = classifySealed(title);
        const groupKey = setCode ? `${setCode}|${type}` : title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
        const key = `${groupKey}|${store.key}`;
        const prev = rows.get(key);
        if (prev && (prev.inStock || !inStock) && prev.priceCents <= priceCents) continue;
        rows.set(key, {
          groupKey,
          title,
          productType: type,
          setCode,
          retailer: store.key,
          retailerName: store.name,
          priceCents,
          url: `${store.base}/products/${p.handle}`,
          imageUrl: p.images?.[0]?.src ?? null,
          country: cc,
          inStock,
          productSlug: featuredRestockSlug(title),
        });
      }
    }
    // Refresh when the scrape succeeded — this also CLEARS stale rows when a
    // previously mis-detected single no longer matches (rows.size can be 0). If
    // the fetch failed entirely (no products at all), keep the existing rows.
    if (scraped) {
      await prisma.sealedListing.deleteMany({ where: { retailer: store.key } });
      if (rows.size) await prisma.sealedListing.createMany({ data: Array.from(rows.values()) });
      count += rows.size;
    }
  }

  // NOTE: the eBay sealed search that used to run here has been removed —
  // DexCompare makes ZERO eBay API calls (that Browse quota is RiftCompare's).
  // eBay stays on the site as plain EPN-tagged search links only.

  // TCGplayer's official sealed catalogue (US market prices) — adds products the
  // store scrape misses (booster cases, elite trainer boxes, collection boxes,
  // tins, bundles). Isolated so a hiccup never fails the rest.
  try {
    count += await refreshTcgplayerSealed();
  } catch (e) {
    console.warn("TCGplayer sealed import failed:", e);
  }

  // Self-heal: drop any stored rows that no longer qualify (e.g. a store that
  // failed to re-scrape this run still holds an old mis-detected single, or rows
  // from before the filters tightened).
  await cleanupStaleSealed();

  return count;
}

// Pull TCGplayer's official sealed catalogue (US market prices) into SealedListing.
// TCGplayer is the dominant US marketplace and lists the full sealed line-up
// (booster boxes/displays/cases, elite trainer boxes, collection boxes, bundles,
// tins, booster packs), so this fills the gaps the store scrape misses for the US.
export async function refreshTcgplayerSealed(): Promise<number> {
  let products;
  try {
    products = await fetchTcgplayerSealed();
  } catch (e) {
    console.warn("TCGplayer sealed fetch failed:", (e as Error).message);
    return 0;
  }
  const rows: any[] = [];
  for (const p of products) {
    const title = (p.productName ?? "").trim();
    const market = p.marketPrice;
    if (!title || market == null || market <= 0) continue;
    if (SEALED_EXCLUDE.test(title)) continue; // graded slabs / non-English / bulk
    const setCode = setCodeFromSetName(p.setName ?? "") ?? detectSetMeta(title)?.code ?? null;
    const type = classifySealed(title);
    const groupKey = setCode ? `${setCode}|${type}` : title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    rows.push({
      groupKey,
      title,
      productType: type,
      setCode,
      retailer: "tcgplayer",
      retailerName: "TCGplayer",
      priceCents: Math.round(market * 100),
      url: tcgProductUrl(p),
      imageUrl: tcgImageUrl(p.productId),
      country: "US",
      inStock: true,
      productSlug: featuredRestockSlug(title),
    });
  }
  await prisma.sealedListing.deleteMany({ where: { retailer: "tcgplayer" } });
  if (rows.length) await prisma.sealedListing.createMany({ data: rows });
  console.log(`TCGplayer sealed: ${rows.length} products.`);
  return rows.length;
}

// Delete stored sealed rows whose title should now be excluded — independent of
// scraping, so stale data gets cleaned even when a store didn't refresh.
export async function cleanupStaleSealed(): Promise<number> {
  const rows = await prisma.sealedListing.findMany({ select: { id: true, title: true, retailer: true, productSlug: true } });
  const ids = rows
    // TCGplayer rows come from the official sealed catalogue — never title-filter them.
    .filter((r) => r.retailer !== "tcgplayer" && (!SEALED_TITLE.test(r.title) || SEALED_EXCLUDE.test(r.title) || !isPokémonSealed(r.title)))
    .map((r) => r.id);
  if (ids.length) await prisma.sealedListing.deleteMany({ where: { id: { in: ids } } });

  // Reconcile the precomputed productSlug for rows this run didn't rewrite (a
  // store whose scrape failed keeps its old rows) and for anything imported
  // before the column existed / before a new FEATURED_RESTOCKS entry was added.
  // Runs at import time only, off the request path, and writes one grouped
  // update per slug rather than a row-at-a-time loop.
  const dead = new Set(ids);
  const wanted = new Map<string | null, string[]>();
  for (const r of rows) {
    if (dead.has(r.id)) continue;
    const slug = featuredRestockSlug(r.title);
    if (slug === r.productSlug) continue;
    const arr = wanted.get(slug) ?? [];
    arr.push(r.id);
    wanted.set(slug, arr);
  }
  for (const [slug, staleIds] of wanted) {
    await prisma.sealedListing.updateMany({ where: { id: { in: staleIds } }, data: { productSlug: slug } });
  }

  return ids.length;
}

export interface SealedListingRow {
  retailer: string;
  retailerName: string;
  priceCents: number;
  url: string;
  inStock: boolean;
  lastSeen: Date;
}

export interface SealedGroup {
  groupKey: string;
  slug: string; // URL-safe identity for /sealed/<slug>
  name: string;
  productType: string;
  setCode: string | null;
  setName: string | null;
  releaseDate: string | null; // detected set's release date (ISO) for "new arrivals"
  imageUrl: string | null;
  lowestPriceCents: number | null;
  storeCount: number; // in-stock stores
  totalCount: number; // all stores listing it (incl. out of stock)
  listings: SealedListingRow[];
}

const SEALED_MARKETS = new Set(["AU", "US", "GB"]);

// URL-safe identity for a sealed group (groupKey can contain "|", spaces, …).
export function sealedSlug(groupKey: string): string {
  return groupKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product";
}

// Product types we can reconstruct from a slug, longest slug fragment first so
// "booster-bundle" wins over "bundle" and "booster-box" over "box". These mirror
// the labels classifySealed() emits, which is what groupKeys are built from.
const SEALED_TYPE_SLUGS: { type: string; slug: string }[] = [
  "Elite Trainer Box", "Booster Bundle", "Sleeved Booster", "Build & Battle",
  "Collection Box", "Booster Case", "Booster Box", "Booster Pack", "Gift Box",
  "Bundle", "Sealed", "Tin",
]
  .map((type) => ({ type, slug: sealedSlug(type) }))
  .sort((a, b) => b.slug.length - a.slug.length);

// Rebuild a sealed product's identity from its slug (set code + product type)
// even when NO store currently lists it. Sealed pages are otherwise ephemeral —
// they exist only while a listing does — so a product that's indexed by Google
// and then sells out everywhere turns into a 404 (e.g. /sealed/me4-collection-box
// when Chaos Rising collection boxes are gone). With this, such a slug serves a
// real "no stores listing right now / set an alert" page (200) instead. Returns
// null for slugs that don't map to a known set + sealed type, which still 404.
export function synthesizeSealedGroup(slug: string): SealedGroup | null {
  for (const { type, slug: typeSlug } of SEALED_TYPE_SLUGS) {
    if (!slug.endsWith(`-${typeSlug}`)) continue;
    const codeSlug = slug.slice(0, slug.length - typeSlug.length - 1);
    const set = POKEMON_SETS.find((s) => sealedSlug(s.code) === codeSlug);
    if (!set) continue;
    return {
      groupKey: `${set.code}|${type}`,
      slug,
      name: `${set.name} ${type}`,
      productType: type,
      setCode: set.code,
      setName: set.name,
      releaseDate: set.releaseDate,
      imageUrl: set.logo,
      lowestPriceCents: null,
      storeCount: 0,
      totalCount: 0,
      listings: [],
    };
  }
  return null;
}

// Pokémon sealed set detection: longest set name that appears in the product
// title wins (so "Base Set 2" beats "Base"). Cached, derived from the catalogue.
let SETS_BY_LEN: { code: string; name: string; releaseDate: string; rx: RegExp }[] | null = null;
function setsByLen() {
  if (!SETS_BY_LEN) {
    SETS_BY_LEN = POKEMON_SETS.filter((s) => s.name && s.name.length >= 4)
      .map((s) => ({ code: s.code, name: s.name, releaseDate: s.releaseDate, rx: new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")}\\b`, "i") }))
      .sort((a, b) => b.name.length - a.name.length);
  }
  return SETS_BY_LEN;
}
function detectSetMeta(title: string): { code: string; name: string; releaseDate: string } | null {
  for (const s of setsByLen()) if (s.rx.test(title)) return { code: s.code, name: s.name, releaseDate: s.releaseDate };
  return null;
}

// Pokémon product-type display order (chase SKUs first).
const TYPE_ORDER = ["Booster Box", "Booster Case", "Elite Trainer Box", "Collection Box", "Bundle", "Tin", "Sleeved Booster", "Booster Pack", "Sealed"];
const typeRank = (t: string) => {
  const i = TYPE_ORDER.indexOf(t);
  return i < 0 ? 99 : i;
};

// Group sealed listings by product for the /sealed pages, for one market.
//
// CACHED IN PROCESS MEMORY: this pulls the market's entire sealed table, which
// is multi-megabyte — fetching it from Neon on EVERY request is the
// network-transfer bomb that burned through two free-tier allowances.
// unstable_cache can't hold it (2 MB item limit fails silently), so it uses
// the same globalThis memo pattern as the games pool: one DB pull per market
// per warm lambda per TTL.
type SealedMemo = Map<string, { at: number; data: SealedGroup[] }>;
const sealedMemo: SealedMemo = ((globalThis as unknown as { __sealedGroups?: SealedMemo }).__sealedGroups ??= new Map());
// 60 min: getSealedGroups pulls the whole (multi-MB) sealed table for a market,
// so a short TTL means every serverless cold-start re-pulls it — a real chunk of
// Neon transfer. Sealed stock changes slowly (the live restock TRACKER uses its
// own query), so an hour of staleness on the compare pages is fine and cuts the
// cold-start re-pulls ~4×.
const SEALED_MEMO_TTL_MS = 60 * 60_000;

export async function getSealedGroups(country: string = "AU"): Promise<SealedGroup[]> {
  const market = SEALED_MARKETS.has(country) ? country : "AU";
  const hit = sealedMemo.get(market);
  if (hit && Date.now() - hit.at < SEALED_MEMO_TTL_MS) return hit.data;
  // Only the fields the grouping uses — no point hauling unused columns.
  const rows = await prisma.sealedListing.findMany({
    where: { country: market },
    orderBy: { priceCents: "asc" },
    select: {
      groupKey: true, title: true, productType: true, setCode: true, imageUrl: true,
      retailer: true, retailerName: true, priceCents: true, url: true, inStock: true, lastSeen: true,
    },
  });
  const groups = new Map<string, SealedGroup>();
  for (const r of rows) {
    let g = groups.get(r.groupKey);
    if (!g) {
      const det = detectSetMeta(r.title);
      g = {
        groupKey: r.groupKey,
        slug: sealedSlug(r.groupKey),
        name: r.title,
        productType: r.productType,
        setCode: det?.code ?? r.setCode ?? null,
        setName: det?.name ?? null,
        releaseDate: det?.releaseDate ?? null,
        imageUrl: r.imageUrl,
        lowestPriceCents: null,
        storeCount: 0,
        totalCount: 0,
        listings: [],
      };
      groups.set(r.groupKey, g);
    }
    if (!g.imageUrl && r.imageUrl) g.imageUrl = r.imageUrl;
    g.listings.push({ retailer: r.retailer, retailerName: r.retailerName, priceCents: r.priceCents, url: r.url, inStock: r.inStock, lastSeen: r.lastSeen });
  }
  const out = Array.from(groups.values()).map((g) => {
    g.listings.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.priceCents - b.priceCents);
    const inStock = g.listings.filter((l) => l.inStock);
    g.lowestPriceCents = inStock[0]?.priceCents ?? null; // null = sold out everywhere
    g.storeCount = new Set(inStock.map((l) => l.retailerName)).size;
    g.totalCount = new Set(g.listings.map((l) => l.retailerName)).size;
    return g;
  });
  out.sort((a, b) => {
    const ra = typeRank(a.productType), rb = typeRank(b.productType);
    if (ra !== rb) return ra - rb;
    return (a.lowestPriceCents ?? 9e9) - (b.lowestPriceCents ?? 9e9);
  });
  sealedMemo.set(market, { at: Date.now(), data: out });
  return out;
}

// A single sealed product for its compare page.
export async function getSealedGroup(slug: string, country: string = "AU"): Promise<SealedGroup | null> {
  const all = await getSealedGroups(country);
  return all.find((g) => g.slug === slug) ?? null;
}

// "New sealed arrivals" for the homepage — sealed product for the most recently
// released sets first (detected from the set catalogue), preferring in-stock.
export async function getNewSealedArrivals(country: string, limit = 12): Promise<SealedGroup[]> {
  const all = await getSealedGroups(country);
  return all
    .filter((g) => g.releaseDate) // only products we could tie to a real set
    .sort((a, b) => {
      if (a.releaseDate !== b.releaseDate) return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
      // Same set → boxes/ETBs first, then in-stock, then price.
      const ra = typeRank(a.productType), rb = typeRank(b.productType);
      if (ra !== rb) return ra - rb;
      return Number(!!b.lowestPriceCents) - Number(!!a.lowestPriceCents);
    })
    .slice(0, limit);
}
