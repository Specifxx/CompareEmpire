import { prisma } from "./db";
import { FEATURED_RESTOCKS, isHeadlineType } from "./restocks";
import { pingUrlNow } from "./indexnow";

// Lightweight, frequent re-check of ONLY the featured products' store listings, so
// the tracker + restock alerts are near-real-time (the full nightly import is far
// too slow for sets that sell out in minutes). For each Shopify-store listing we
// already hold for a featured product, re-fetch its product.json, update the live
// in-stock state, and log restock events on every out-of-stock → in-stock flip.
//
// Scope is deliberately tiny (a handful of products × their existing store rows),
// so this is cheap to run every ~15 minutes from a scheduled GitHub workflow.

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export interface RecheckSummary {
  checked: number;
  flippedInStock: number; // OOS → in-stock transitions (logged as restock events)
  flippedOutOfStock: number; // in-stock → OOS transitions (events closed)
}

// Cheapest AVAILABLE variant price (cents) from a Shopify product.json, or null
// when nothing is in stock / the page can't be read.
async function fetchShopifyStock(productUrl: string): Promise<{ inStock: boolean; priceCents: number | null }> {
  const url = productUrl.replace(/[?#].*$/, "").replace(/\/+$/, "") + ".json";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) return { inStock: false, priceCents: null };
    const data: any = await res.json();
    const variants: any[] = data?.product?.variants ?? [];
    const available = variants.filter((v) => v.available && parseFloat(v.price) > 0);
    if (!available.length) return { inStock: false, priceCents: null };
    const cents = Math.min(...available.map((v) => Math.round(parseFloat(v.price) * 100)));
    return { inStock: true, priceCents: cents };
  } catch {
    return { inStock: false, priceCents: null };
  } finally {
    clearTimeout(t);
  }
}

// A Shopify product URL (vs eBay / TCGplayer, which we leave to the nightly run).
function isShopifyProductUrl(url: string): boolean {
  return /\/products\//.test(url) && !/ebay\.|tcgplayer\.com/i.test(url);
}

// Retention so this append-only log can't grow unbounded — it's low-volume
// (only featured/headline SKUs, only on a flip) but nothing purged it before.
const RETENTION_DAYS = 180;

// Hard ceiling on rows pulled (and therefore HTTP-polled) per re-check cycle.
// A handful of featured products × the stores that list them is a few dozen rows;
// this only ever bites if FEATURED_RESTOCKS grows a very loose matcher.
const MAX_RECHECK_ROWS = 300;

export async function recheckFeaturedRestocks(): Promise<RecheckSummary> {
  const summary: RecheckSummary = { checked: 0, flippedInStock: 0, flippedOutOfStock: 0 };

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
  await prisma.restockEvent.deleteMany({ where: { inStockAt: { lt: cutoff } } }).catch(() => {});

  // SCOPED + CAPPED: only the featured products' rows (SealedListing.productSlug
  // is precomputed by the importer, indexed) and only Shopify product pages we
  // can actually poll. This used to read the ENTIRE SealedListing table with no
  // take, every 15 minutes, to keep a few dozen rows — pure Neon egress.
  const sealed = await prisma.sealedListing.findMany({
    where: {
      productSlug: { in: FEATURED_RESTOCKS.map((p) => p.slug) },
      url: { contains: "/products/" },
    },
    select: { id: true, title: true, productType: true, retailer: true, retailerName: true, priceCents: true, url: true, inStock: true, country: true, productSlug: true },
    orderBy: { lastSeen: "asc" }, // stalest first, so a cap can never starve a row
    take: MAX_RECHECK_ROWS,
  });

  for (const product of FEATURED_RESTOCKS) {
    // Belt-and-braces on the URL shape (excludes eBay/TCGplayer rows the
    // `/products/` filter can't rule out on its own).
    const rows = sealed.filter((r) => r.productSlug === product.slug && isShopifyProductUrl(r.url));

    // Bounded concurrency so a single re-check stays quick.
    const CONC = 8;
    for (let i = 0; i < rows.length; i += CONC) {
      await Promise.all(
        rows.slice(i, i + CONC).map(async (row) => {
          const live = await fetchShopifyStock(row.url);
          summary.checked++;
          const wasInStock = row.inStock;
          const nowInStock = live.inStock;
          const priceCents = live.priceCents ?? row.priceCents;

          // Persist the fresh state.
          await prisma.sealedListing.update({
            where: { id: row.id },
            data: { inStock: nowInStock, priceCents, lastSeen: new Date() },
          });

          if (!isHeadlineType(row.productType)) return; // only log/alert on major SKUs

          if (!wasInStock && nowInStock) {
            // Restocked — open a new event.
            await prisma.restockEvent.create({
              data: {
                productSlug: product.slug,
                market: row.country,
                retailer: row.retailer,
                retailerName: row.retailerName,
                productType: row.productType,
                priceCents,
                url: row.url,
                inStockAt: new Date(),
              },
            });
            summary.flippedInStock++;
            // Real-time IndexNow ping: a sold-out product coming back is a
            // genuine, discrete content change on exactly one page, and it's
            // time-critical (restocks sell out in minutes). Deduped for an
            // hour per URL so a flapping SKU can't ping every 15-min cycle.
            void pingUrlNow(`/restock/${product.slug}`);
          } else if (wasInStock && !nowInStock) {
            // Sold out — close the most recent open event for this row.
            const open = await prisma.restockEvent.findFirst({
              where: { productSlug: product.slug, market: row.country, retailer: row.retailer, productType: row.productType, soldOutAt: null },
              orderBy: { inStockAt: "desc" },
              select: { id: true, inStockAt: true },
            });
            if (open) {
              const mins = Math.max(1, Math.round((Date.now() - open.inStockAt.getTime()) / 60000));
              await prisma.restockEvent.update({ where: { id: open.id }, data: { soldOutAt: new Date(), durationMins: mins } });
            }
            summary.flippedOutOfStock++;
          }
        })
      );
    }
  }
  return summary;
}

// Recent restock log entries for a product+market (newest first) — for the page.
export async function recentRestockEvents(productSlug: string, market: string, take = 12) {
  return prisma.restockEvent.findMany({
    where: { productSlug, market },
    orderBy: { inStockAt: "desc" },
    take,
    select: { retailerName: true, productType: true, priceCents: true, inStockAt: true, soldOutAt: true, durationMins: true, url: true },
  });
}
