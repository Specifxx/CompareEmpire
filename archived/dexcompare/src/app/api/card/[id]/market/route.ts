import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Per-card marketplace data (asks, bids, viewer gating) for the CLIENT
// <CardMarketplace> component. This lives in an API route — not the card page's
// server render — precisely because it reads the session cookie (getCurrentUser)
// and hits per-viewer state; doing that in the page voided the card page's
// `revalidate` and made all ~20k card pages uncacheable dynamic SSR (Google then
// throttles crawl → "Discovered – not indexed"). Keeping it client-fetched lets
// /card/[id] stay ISR while the test-mode marketplace still works for signed-in
// users. Never cached.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const card = await prisma.card.findFirst({
    where: { OR: [{ slug: params.id }, { id: params.id }] },
    select: { id: true },
  });
  if (!card) return NextResponse.json({ listings: [], buyOrders: [], viewer: null });

  const [viewer, listings, buyOrders] = await Promise.all([
    getCurrentUser(),
    prisma.listing.findMany({
      where: { cardId: card.id, status: "ACTIVE", quantity: { gt: 0 } },
      orderBy: { priceCents: "asc" },
      select: {
        id: true, condition: true, isFoil: true, priceCents: true, quantity: true,
        currency: true, sellerId: true,
        seller: { select: { displayName: true, sellerName: true } },
      },
    }),
    prisma.buyOrder.findMany({
      where: { cardId: card.id, status: "OPEN" },
      orderBy: { maxPriceCents: "desc" },
      select: {
        id: true, condition: true, isFoil: true, maxPriceCents: true,
        quantity: true, quantityFilled: true, buyerId: true,
        buyer: { select: { displayName: true } },
      },
    }),
  ]);
  const viewerAccount = viewer
    ? await prisma.user.findUnique({ where: { id: viewer.id }, select: { verifiedSeller: true } })
    : null;

  return NextResponse.json(
    {
      listings,
      buyOrders,
      viewer: viewer ? { id: viewer.id, verifiedSeller: !!viewerAccount?.verifiedSeller } : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
