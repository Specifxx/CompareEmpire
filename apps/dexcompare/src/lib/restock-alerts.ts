import { prisma } from "./db";
import { FEATURED_RESTOCKS, restockTitleRegex, isHeadlineType } from "./restocks";
import { sendRestockEmail, type RestockItem } from "./email";
import { currencyOf, type Country } from "./country";
import { affiliateUrl } from "./affiliate";
import { SITE_URL } from "./site";

export interface RestockRunSummary {
  products: number;
  emailsSent: number;
  rearmed: number; // subscribers re-armed because their product sold out again
}

// In-stock HEADLINE listings (Booster Box / ETB / Bundle / Case) for a featured
// product in a market — cheapest per product type. Loose packs are intentionally
// excluded so a $9 sleeved booster never fires "it's back in stock!" emails.
async function inStockHeadlineItems(re: RegExp, market: Country): Promise<RestockItem[]> {
  const rows = await prisma.sealedListing.findMany({
    where: { country: market, inStock: true },
    select: { title: true, productType: true, retailerName: true, priceCents: true, url: true },
    orderBy: { priceCents: "asc" },
  });
  const cur = currencyOf(market);
  const cheapestByType = new Map<string, RestockItem>();
  for (const r of rows) {
    if (!re.test(r.title) || !isHeadlineType(r.productType)) continue;
    if (cheapestByType.has(r.productType)) continue; // rows are price-asc → first is cheapest
    cheapestByType.set(r.productType, {
      productType: r.productType,
      retailerName: r.retailerName,
      priceCents: r.priceCents,
      url: affiliateUrl(r.url),
      currency: cur,
    });
  }
  return [...cheapestByType.values()];
}

// Walk every featured product × market. When a HEADLINE SKU is in stock, email
// every subscriber not yet notified for the current window — with the exact items
// (type, store, price, buy link) — and mark them notified. When nothing major is
// in stock, clear notifiedAt so the same subscriber gets the NEXT restock too.
export async function runRestockAlerts(): Promise<RestockRunSummary> {
  const MARKETS: Country[] = ["AU", "NZ", "US", "GB"];
  const summary: RestockRunSummary = { products: 0, emailsSent: 0, rearmed: 0 };

  for (const product of FEATURED_RESTOCKS) {
    const re = restockTitleRegex(product);
    summary.products++;
    for (const market of MARKETS) {
      const items = await inStockHeadlineItems(re, market);
      if (items.length > 0) {
        const pending = await prisma.restockAlert.findMany({
          where: { productSlug: product.slug, market, notifiedAt: null },
          select: { id: true, email: true, unsubToken: true },
        });
        for (const a of pending) {
          const trackerUrl = `${SITE_URL}/restock/${product.slug}`;
          const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(a.unsubToken)}`;
          const sent = await sendRestockEmail(a.email, product.shortName, items, trackerUrl, unsubUrl);
          if (sent) {
            await prisma.restockAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
            summary.emailsSent++;
          }
        }
      } else {
        const res = await prisma.restockAlert.updateMany({
          where: { productSlug: product.slug, market, notifiedAt: { not: null } },
          data: { notifiedAt: null },
        });
        summary.rearmed += res.count;
      }
    }
  }
  return summary;
}
