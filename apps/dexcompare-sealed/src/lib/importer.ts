// The import: read every store's Pokémon sealed listings and replace the
// current state in the database. Runs from scripts/import.ts (GitHub Actions),
// never on a request path — it reads whole tables on purpose (src/lib/db.ts).
//
// Per store, in order:
//   1. Currency guard — the store must charge in its market's currency, or
//      nothing it lists is written (a C$ price must never render as US$).
//   2. Read its configured collections, passing ?country= so a Shopify
//      Markets store answers in its own currency (see shopifyMeta in feeds.ts).
//      If every configured collection has gone, rediscover from its sitemap.
//   3. identify() every title (src/lib/sealed-title.ts) and keep the store's
//      best listing per product: in stock first, then cheapest, and never below
//      the product type's price floor.
//   4. Only after a SUCCESSFUL read are the store's rows replaced. A failed
//      read keeps the old rows, which age into "unknown" after 72 hours.
//
// Then every product's per-market summary (ProductStat) and every store's
// health (StoreStat) is recomputed from the stored offers.
import { prisma } from "./db";
import {
  isPokemonCollection,
  rankCollections,
  readShopifyCollection,
  readWooCategory,
  shopifyMeta,
  sitemapCollections,
  wooCategories,
  type CollectionRead,
  type FeedProduct,
} from "./feeds";
import { RateLimitedError, REQUEST_DELAY_MS, sleep } from "./scrape-http";
import { floorCents, identify, isIdentity, type SealedIdentity } from "./sealed-title";
import { headlineOffer, offerStock } from "./sealed-offers";
import { STORES, storeCurrency, type StoreConfig } from "./stores";

export interface ImportRow {
  identity: SealedIdentity;
  title: string;
  url: string;
  priceCents: number;
  inStock: boolean;
  imageUrl: string | null;
}

export interface StoreRead {
  store: StoreConfig;
  ok: boolean;
  error: string | null;
  rows: ImportRow[];
  products: number; // feed products read, before identify()
  rediscovered: boolean;
  ms: number;
}

const MAX_PAGES = 8; // per collection: 2,000 products
const OFFER_TTL_DAYS = 14; // an offer not re-read for this long is deleted
// An in-stock price below 25% of the product's IN-STOCK median in that market
// is a mislisting (a pack filed as a box, a deposit variant). Not tighter: for
// out-of-print sets, one store selling old stock at the original price next to
// others asking collector prices is real, and it's the deal people want.
const LOW_OUTLIER = 0.25;

// A variant that is several of the product ("Display (10)", "Case of 6",
// "3 x", "Booster Box" on a pack listing) — stores sell singles and multiples
// as options of one listing, and the multiple's price is not the product's.
const MULTI_VARIANT = /\bdisplays?\b|\bcases?\b|\bbox\s*of\b|\bsets?\s*of\b|\bbundle\b|\blot\b|\bbooster\s*box\b|\b(?:[2-9]|[1-9]\d)\s*x\b|\bx\s*(?:[2-9]|[1-9]\d)\b|\b(?:[2-9]|[1-9]\d)\s*(?:packs?|tins?|boxes|units?|pcs|pieces)\b|\bfull\s*(?:set|case)\b|\ball\s*\d/i;

/** Pick the price a product lists at: the cheapest orderable variant at or above the floor. */
export function priceOf(p: FeedProduct, floor: number): { priceCents: number; inStock: boolean } | null {
  // With several options, drop the multi-unit ones. A single variant is the
  // product itself, whatever its (often "Default Title") name says.
  const single = p.variants.length > 1 ? p.variants.filter((v) => !v.title || !MULTI_VARIANT.test(v.title)) : p.variants;
  const priced = single.filter((v) => v.priceCents > 0);
  if (!priced.length) return null;
  const avail = priced.filter((v) => v.available);
  const inStock = avail.length > 0;
  const pool = (inStock ? avail : priced).filter((v) => v.priceCents >= floor);
  if (!pool.length) return null;
  return { priceCents: Math.min(...pool.map((v) => v.priceCents)), inStock };
}

/** Is `a` a better listing of the same product than `b`? In stock beats sold out, then cheaper wins. */
function better(a: ImportRow, b: ImportRow): boolean {
  if (a.inStock !== b.inStock) return a.inStock;
  return a.priceCents < b.priceCents;
}

export function rowsFromReads(store: StoreConfig, reads: CollectionRead[]): ImportRow[] {
  const best = new Map<string, ImportRow>();
  const seen = new Set<string>();
  for (const r of reads) {
    const strict = !isPokemonCollection(r.handle) && !r.handle.startsWith("search:");
    for (const p of r.products) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const id = identify(p.title, { strict });
      if (!isIdentity(id)) continue;
      const price = priceOf(p, floorCents(id.type, store.market));
      if (!price) continue;
      const row: ImportRow = { identity: id, title: p.title, url: p.url, imageUrl: p.imageUrl, ...price };
      const prev = best.get(id.groupKey);
      if (!prev || better(row, prev)) best.set(id.groupKey, row);
    }
  }
  return [...best.values()];
}

async function readShopifyStore(store: StoreConfig): Promise<{ reads: CollectionRead[]; rediscovered: boolean; error: string | null }> {
  const expected = storeCurrency(store);
  const meta = await shopifyMeta(store.base, store.country);
  if (meta.currency && meta.currency !== expected) {
    return { reads: [], rediscovered: false, error: `store now charges ${meta.currency}, market ${store.market} is ${expected}` };
  }
  const reads: CollectionRead[] = [];
  for (const handle of store.collections) {
    await sleep(REQUEST_DELAY_MS);
    reads.push(await readShopifyCollection(store.base, handle, { country: store.country, maxPages: MAX_PAGES }));
  }
  if (reads.some((r) => r.ok && r.products.length)) return { reads, rediscovered: false, error: null };
  // Every configured collection is gone or empty: the store renamed them.
  const found = rankCollections(await sitemapCollections(store.base)).slice(0, 4);
  for (const handle of found) {
    await sleep(REQUEST_DELAY_MS);
    reads.push(await readShopifyCollection(store.base, handle, { country: store.country, maxPages: MAX_PAGES }));
  }
  return { reads, rediscovered: found.length > 0, error: null };
}

async function readWooStore(store: StoreConfig): Promise<{ reads: CollectionRead[]; rediscovered: boolean; error: string | null }> {
  const expected = storeCurrency(store);
  const cats = await wooCategories(store.base);
  const ids = new Map(cats.map((c) => [c.slug, c.id]));
  const reads: CollectionRead[] = [];
  for (const slug of store.collections) {
    await sleep(REQUEST_DELAY_MS);
    reads.push(await readWooCategory(store.base, slug, ids, MAX_PAGES));
  }
  let rediscovered = false;
  if (!reads.some((r) => r.ok && r.products.length)) {
    reads.push(await readWooCategory(store.base, "search:pokemon", ids, MAX_PAGES));
    rediscovered = true;
  }
  const wrong = reads.flatMap((r) => r.products).find((p) => p.currency && p.currency !== expected);
  if (wrong) return { reads: [], rediscovered, error: `store now charges ${wrong.currency}, market ${store.market} is ${expected}` };
  return { reads, rediscovered, error: null };
}

export async function readStore(store: StoreConfig): Promise<StoreRead> {
  const t0 = Date.now();
  try {
    const { reads, rediscovered, error } = store.platform === "woocommerce" ? await readWooStore(store) : await readShopifyStore(store);
    const products = reads.reduce((n, r) => n + r.products.length, 0);
    if (error) return { store, ok: false, error, rows: [], products, rediscovered, ms: Date.now() - t0 };
    // An empty read (every collection 404, a block page, a timeout) is a
    // failure, not "the store sold everything": keep yesterday's rows.
    if (!reads.some((r) => r.ok) || products === 0) {
      return { store, ok: false, error: "no products read", rows: [], products, rediscovered, ms: Date.now() - t0 };
    }
    return { store, ok: true, error: null, rows: rowsFromReads(store, reads), products, rediscovered, ms: Date.now() - t0 };
  } catch (e) {
    const error = e instanceof RateLimitedError ? `rate limited: ${e.message}` : (e as Error).message || String(e);
    return { store, ok: false, error, rows: [], products: 0, rediscovered: false, ms: Date.now() - t0 };
  }
}

/**
 * Drop in-stock rows priced far below the other stores' price for the same
 * product in the same market — a pack filed as a box, a deposit variant. Needs
 * three or more listings to have a median worth trusting.
 */
export function dropLowOutliers(reads: StoreRead[]): number {
  const prices = new Map<string, number[]>();
  for (const r of reads)
    for (const row of r.rows) {
      if (!row.inStock) continue; // sold-out asks aren't a market
      const k = `${r.store.market}|${row.identity.groupKey}`;
      (prices.get(k) ?? prices.set(k, []).get(k)!).push(row.priceCents);
    }
  const median = new Map<string, number>();
  for (const [k, v] of prices) {
    if (v.length < 3) continue;
    const s = [...v].sort((a, b) => a - b);
    median.set(k, s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
  }
  let dropped = 0;
  for (const r of reads) {
    r.rows = r.rows.filter((row) => {
      const m = median.get(`${r.store.market}|${row.identity.groupKey}`);
      if (m != null && row.inStock && row.priceCents < m * LOW_OUTLIER) {
        dropped++;
        console.warn(`  outlier dropped: ${r.store.key} "${row.title}" ${row.priceCents} vs median ${m}`);
        return false;
      }
      return true;
    });
  }
  return dropped;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** Create any products this run found for the first time. Returns groupKey → product id. */
async function upsertProducts(reads: StoreRead[]): Promise<Map<string, string>> {
  const existing = await prisma.product.findMany({ select: { id: true, groupKey: true, slug: true, imageUrl: true } });
  const byKey = new Map(existing.map((p) => [p.groupKey, p]));
  const slugs = new Set(existing.map((p) => p.slug));
  const fresh = new Map<string, { identity: SealedIdentity; imageUrl: string | null }>();
  const needImage = new Map<string, string>();
  for (const r of reads)
    for (const row of r.rows) {
      const k = row.identity.groupKey;
      const have = byKey.get(k);
      if (have) {
        if (!have.imageUrl && row.imageUrl && !needImage.has(have.id)) needImage.set(have.id, row.imageUrl);
        continue;
      }
      const f = fresh.get(k);
      if (!f) fresh.set(k, { identity: row.identity, imageUrl: row.imageUrl });
      else if (!f.imageUrl && row.imageUrl) f.imageUrl = row.imageUrl;
    }
  const data = [...fresh.values()].map(({ identity, imageUrl }) => {
    let slug = identity.slugBase || "product";
    for (let n = 2; slugs.has(slug); n++) slug = `${identity.slugBase}-${n}`;
    slugs.add(slug);
    return {
      groupKey: identity.groupKey,
      slug,
      name: identity.name,
      productType: identity.typeLabel,
      setCode: identity.set?.code ?? null,
      imageUrl,
    };
  });
  if (data.length) await prisma.product.createMany({ data, skipDuplicates: true });
  for (const [id, imageUrl] of needImage) await prisma.product.update({ where: { id }, data: { imageUrl } });
  const all = await prisma.product.findMany({ select: { id: true, groupKey: true } });
  console.log(`products: ${data.length} new, ${needImage.size} given an image, ${all.length} total`);
  return new Map(all.map((p) => [p.groupKey, p.id]));
}

async function writeOffers(reads: StoreRead[], ids: Map<string, string>, now: Date): Promise<number> {
  let written = 0;
  for (const r of reads) {
    if (!r.ok) continue;
    const data = r.rows.map((row) => ({
      productId: ids.get(row.identity.groupKey)!,
      store: r.store.key,
      market: r.store.market,
      title: row.title.slice(0, 300),
      url: row.url,
      priceCents: row.priceCents,
      inStock: row.inStock,
      imageUrl: row.imageUrl,
      lastSeen: now,
    }));
    await prisma.$transaction([
      prisma.offer.deleteMany({ where: { store: r.store.key } }),
      prisma.offer.createMany({ data }),
    ]);
    written += data.length;
  }
  // Stores that left the registry, and rows no successful read has confirmed in weeks.
  const registered = STORES.map((s) => s.key);
  const gone = await prisma.offer.deleteMany({
    where: { OR: [{ store: { notIn: registered } }, { lastSeen: { lt: new Date(now.getTime() - OFFER_TTL_DAYS * 86400_000) } }] },
  });
  if (gone.count) console.log(`offers: pruned ${gone.count} stale or orphaned`);
  // A product no store has listed for OFFER_TTL_DAYS and nobody is watching:
  // its page would only say "not listed anywhere". It comes back (same slug) if
  // a store lists it again. Also clears products a classifier change re-keyed.
  const dead = await prisma.product.deleteMany({ where: { offers: { none: {} }, alerts: { none: {} } } });
  if (dead.count) console.log(`products: removed ${dead.count} no store lists`);
  return written;
}

/** Recompute every product's per-market summary from the stored offers. */
export async function recomputeStats(now = new Date()): Promise<number> {
  const offers = await prisma.offer.findMany({
    select: { productId: true, market: true, store: true, priceCents: true, inStock: true, lastSeen: true },
  });
  const groups = new Map<string, typeof offers>();
  for (const o of offers) {
    const k = `${o.productId}|${o.market}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(o);
  }
  const data = [...groups.entries()].map(([k, list]) => {
    const [productId, market] = k.split("|");
    const open = list.filter((o) => offerStock(o, now.getTime()) === "open");
    return {
      productId,
      market,
      lowestPriceCents: headlineOffer(list, now.getTime())?.priceCents ?? null,
      inStockStores: new Set(open.map((o) => o.store)).size,
      listedStores: new Set(list.map((o) => o.store)).size,
    };
  });
  await prisma.$transaction([prisma.productStat.deleteMany({}), prisma.productStat.createMany({ data })]);
  return data.length;
}

async function writeStoreStats(reads: StoreRead[], now: Date): Promise<void> {
  const counts = await prisma.offer.groupBy({ by: ["store", "inStock"], _count: { _all: true } });
  const listed = new Map<string, number>();
  const inStock = new Map<string, number>();
  for (const c of counts) {
    listed.set(c.store, (listed.get(c.store) ?? 0) + c._count._all);
    if (c.inStock) inStock.set(c.store, c._count._all);
  }
  for (const r of reads) {
    const data = {
      market: r.store.market,
      listed: listed.get(r.store.key) ?? 0,
      inStock: inStock.get(r.store.key) ?? 0,
      lastError: r.error,
      ...(r.ok ? { lastOkAt: now } : {}),
    };
    await prisma.storeStat.upsert({ where: { store: r.store.key }, create: { store: r.store.key, ...data }, update: data });
  }
  await prisma.storeStat.deleteMany({ where: { store: { notIn: STORES.map((s) => s.key) } } });
}

export interface ImportSummary {
  stores: number;
  ok: number;
  failed: { key: string; market: string; error: string }[];
  offers: number;
  outliers: number;
  stats: number;
  byMarket: Record<string, { stores: number; ok: number; offers: number; inStock: number }>;
  minutes: number;
}

export async function runImport(opts: { only?: string[]; concurrency?: number } = {}): Promise<ImportSummary> {
  const t0 = Date.now();
  const now = new Date();
  const stores = opts.only?.length ? STORES.filter((s) => opts.only!.includes(s.key) || opts.only!.includes(s.market)) : STORES;
  console.log(`reading ${stores.length} stores…`);
  let done = 0;
  const reads = await mapLimit(stores, opts.concurrency ?? 3, async (s) => {
    const r = await readStore(s);
    done++;
    const inStock = r.rows.filter((x) => x.inStock).length;
    console.log(
      `[${done}/${stores.length}] ${s.market} ${s.key}: ` +
        (r.ok ? `${r.rows.length} sealed (${inStock} in stock) from ${r.products} products` : `FAILED — ${r.error}`) +
        `${r.rediscovered ? " [rediscovered collections]" : ""} · ${(r.ms / 1000).toFixed(0)}s`,
    );
    return r;
  });

  const outliers = dropLowOutliers(reads);
  const ids = await upsertProducts(reads.filter((r) => r.ok));
  const offers = await writeOffers(reads, ids, now);
  const stats = await recomputeStats(now);
  await writeStoreStats(reads, now);

  const byMarket: ImportSummary["byMarket"] = {};
  for (const r of reads) {
    const m = (byMarket[r.store.market] ??= { stores: 0, ok: 0, offers: 0, inStock: 0 });
    m.stores++;
    if (r.ok) {
      m.ok++;
      m.offers += r.rows.length;
      m.inStock += r.rows.filter((x) => x.inStock).length;
    }
  }
  return {
    stores: reads.length,
    ok: reads.filter((r) => r.ok).length,
    failed: reads.filter((r) => !r.ok).map((r) => ({ key: r.store.key, market: r.store.market, error: r.error ?? "?" })),
    offers,
    outliers,
    stats,
    byMarket,
    minutes: (Date.now() - t0) / 60000,
  };
}
