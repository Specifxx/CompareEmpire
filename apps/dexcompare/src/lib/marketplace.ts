// Marketplace ↔ price-comparison bridge. A verified seller's ACTIVE listing is
// mirrored into RetailerPrice as its own "store" (key mkt_<sellerId>) in the
// listing's market, so it appears in the card's price comparison alongside the
// scraped retailers — for every region. Cancelling/selling removes it again.
import { prisma } from "./db";

export const currencyOfCountry = (c: string): string =>
  c === "NZ" ? "NZD" : c === "US" ? "USD" : c === "GB" ? "GBP" : "AUD";

// Recompute one card's per-market lowest in-stock price (mirrors the importer's
// global recompute, scoped to a single card so a new listing shows immediately).
export async function recomputeCardLowest(cardId: string): Promise<void> {
  const rows = await prisma.retailerPrice.groupBy({
    by: ["country"],
    where: { cardId, inStock: true },
    _min: { priceCents: true },
  });
  const m = new Map(rows.map((r) => [r.country, r._min.priceCents ?? null]));
  await prisma.card.update({
    where: { id: cardId },
    data: {
      lowestPriceCents: m.get("AU") ?? null,
      lowestPriceCentsNz: m.get("NZ") ?? null,
      lowestPriceCentsUs: m.get("US") ?? null,
      lowestPriceCentsGb: m.get("GB") ?? null,
    },
  });
}

// Mirror (or remove) a listing in the price comparison, then refresh the card lowest.
export async function syncListingToComparison(listingId: string): Promise<void> {
  const l = await prisma.listing.findUnique({ where: { id: listingId }, include: { card: true, seller: true } });
  if (!l) return;
  const retailer = `mkt_${l.sellerId}`;
  const name = l.seller.sellerName || "CompareEmpire Marketplace";
  const ship = l.shipCents ?? l.seller.shipFlatCents ?? null;
  const live = l.status === "ACTIVE" && l.quantity > 0;
  if (live) {
    await prisma.retailerPrice.upsert({
      where: { cardId_retailer_condition_isFoil: { cardId: l.cardId, retailer, condition: l.condition, isFoil: l.isFoil } },
      create: {
        cardId: l.cardId, retailer, retailerName: name,
        title: `${l.card.name} (${l.card.collectorNumber})`, url: "/marketplace",
        condition: l.condition, isFoil: l.isFoil, priceCents: l.priceCents,
        shippingCents: ship, currency: l.currency, inStock: true, country: l.country,
      },
      update: {
        retailerName: name, priceCents: l.priceCents, shippingCents: ship,
        currency: l.currency, inStock: true, country: l.country, lastSeen: new Date(),
      },
    });
  } else {
    await prisma.retailerPrice.deleteMany({ where: { cardId: l.cardId, retailer, condition: l.condition, isFoil: l.isFoil } });
  }
  await recomputeCardLowest(l.cardId);
}
