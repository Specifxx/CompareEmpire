import { prisma } from "./db";
import { FEATURED_RESTOCKS, restockTitleRegex } from "./restocks";
import { sendRestockEmail } from "./email";
import { SITE_URL } from "./site";

export interface RestockRunSummary {
  products: number;
  emailsSent: number;
  rearmed: number; // subscribers re-armed because their product sold out again
}

// Is a featured product currently IN STOCK in a given market? True when we hold
// at least one in-stock SealedListing whose title matches the product, in that
// market. Matching is done in JS (the regex lives in config) over the small set
// of that market's sealed rows.
async function isInStock(productMatch: RegExp, market: string): Promise<boolean> {
  const rows = await prisma.sealedListing.findMany({
    where: { country: market, inStock: true },
    select: { title: true },
  });
  return rows.some((r) => productMatch.test(r.title));
}

// Walk every featured product × market. When a product is in stock, email every
// subscriber who hasn't been notified for the CURRENT in-stock window and mark
// them notified. When it's out of stock, clear notifiedAt so the same subscriber
// gets the NEXT restock too. Designed to run on the daily cron (and can be run
// more often for faster alerts as scrape cadence allows).
export async function runRestockAlerts(): Promise<RestockRunSummary> {
  const MARKETS = ["AU", "NZ", "US", "GB"];
  const summary: RestockRunSummary = { products: 0, emailsSent: 0, rearmed: 0 };

  for (const product of FEATURED_RESTOCKS) {
    const re = restockTitleRegex(product);
    summary.products++;
    for (const market of MARKETS) {
      const inStock = await isInStock(re, market);
      if (inStock) {
        // Notify everyone watching this product/market who hasn't been told yet.
        const pending = await prisma.restockAlert.findMany({
          where: { productSlug: product.slug, market, notifiedAt: null },
          select: { id: true, email: true, unsubToken: true },
        });
        for (const a of pending) {
          const trackerUrl = `${SITE_URL}/restock/${product.slug}`;
          const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(a.unsubToken)}`;
          const sent = await sendRestockEmail(a.email, product.shortName, trackerUrl, unsubUrl);
          if (sent) {
            await prisma.restockAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
            summary.emailsSent++;
          }
        }
      } else {
        // Sold out again → re-arm anyone previously notified for the next restock.
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
