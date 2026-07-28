import { prisma } from "./db";
import { FEATURED_RESTOCKS, restockTitleRegex, isHeadlineType } from "./restocks";

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

export async function recheckFeaturedRestocks(): Promise<RecheckSummary> {
  const summary: RecheckSummary = { checked: 0, flippedInStock: 0, flippedOutOfStock: 0 };

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
  await prisma.restockEvent.deleteMany({ where: { inStockAt: { lt: cutoff } } }).catch(() => {});

  // The sealed table is small relative to cards, so loading it once and matching
  // by title (authoritative — groupKeys don't carry the product slug) is cheap.
  const sealed = await prisma.sealedListing.findMany({
    select: { id: true, title: true, productType: true, retailer: true, retailerName: true, priceCents: true, url: true, inStock: true, country: true },
  });

  for (const product of FEATURED_RESTOCKS) {
    const re = restockTitleRegex(product);
    // Match by title and limit to Shopify product pages we can actually poll.
    const rows = sealed.filter((r) => re.test(r.title) && isShopifyProductUrl(r.url));

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
