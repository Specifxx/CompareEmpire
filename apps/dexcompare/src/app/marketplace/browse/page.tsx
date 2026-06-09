import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarketplaceBar } from "@/components/MarketplaceBar";
import { MarketplaceGrid, type StoreListing } from "@/components/MarketplaceGrid";

export const metadata: Metadata = {
  title: "Marketplace (Test) — Buy Pokémon singles",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MarketplaceBrowsePage() {
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE", quantity: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      card: { select: { id: true, name: true, collectorNumber: true, setName: true, imageThumbUrl: true } },
      seller: { select: { sellerName: true, shipFlatCents: true } },
    },
  });
  const listings: StoreListing[] = rows.map((l) => ({
    listingId: l.id,
    cardId: l.cardId,
    cardName: l.card.name,
    collectorNumber: l.card.collectorNumber,
    setName: l.card.setName,
    imageThumbUrl: l.card.imageThumbUrl,
    condition: l.condition,
    isFoil: l.isFoil,
    priceCents: l.priceCents,
    currency: l.currency,
    country: l.country,
    shipCents: l.shipCents ?? l.seller.shipFlatCents ?? null,
    sellerName: l.seller.sellerName || "CompareEmpire Marketplace",
    maxQty: l.quantity,
  }));

  return (
    <div className="py-2">
      <MarketplaceBar />
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Marketplace</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Buy singles directly from verified sellers. <span className="text-gold">Test mode</span> — no real payment is taken.
          </p>
        </div>
        <Link href="/marketplace" className="btn-ghost text-xs shrink-0">About →</Link>
      </div>
      {listings.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          No listings yet. Verified sellers can list cards from the seller portal.
        </div>
      ) : (
        <MarketplaceGrid listings={listings} />
      )}
    </div>
  );
}
