import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { syncListingToComparison } from "@/lib/marketplace";

const schema = z.object({
  buyer: z.object({ name: z.string().min(1), email: z.string().email(), address: z.string().min(1) }),
  items: z.array(z.object({ listingId: z.string().min(1), qty: z.number().int().min(1).max(999) })).min(1),
});

// TEST-MODE checkout. Validates listings server-side, records a MarketplaceOrder,
// decrements stock, and refreshes the price comparison. No real payment is taken —
// Stripe Connect will slot in here for live mode (see MARKETPLACE.md).
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const { buyer, items } = parsed.data;

  const snapshot: any[] = [];
  let subtotal = 0;
  let shipping = 0;
  let currency = "AUD";
  const decrements: { id: string; qty: number }[] = [];

  for (const it of items) {
    const l = await prisma.listing.findUnique({
      where: { id: it.listingId },
      include: { card: { select: { name: true, collectorNumber: true } }, seller: { select: { sellerName: true, shipFlatCents: true } } },
    });
    if (!l || l.status !== "ACTIVE" || l.quantity < it.qty) {
      return NextResponse.json({ error: `"${l?.card.name ?? "An item"}" is no longer available in that quantity.` }, { status: 409 });
    }
    const ship = l.shipCents ?? l.seller.shipFlatCents ?? 0;
    subtotal += l.priceCents * it.qty;
    shipping += ship * it.qty;
    currency = l.currency;
    snapshot.push({
      listingId: l.id, cardName: l.card.name, collectorNumber: l.card.collectorNumber,
      condition: l.condition, isFoil: l.isFoil, qty: it.qty, priceCents: l.priceCents,
      currency: l.currency, sellerName: l.seller.sellerName || "CompareEmpire Marketplace",
    });
    decrements.push({ id: l.id, qty: it.qty });
  }

  const order = await prisma.marketplaceOrder.create({
    data: {
      buyerName: buyer.name, buyerEmail: buyer.email, shippingAddress: buyer.address,
      items: snapshot, subtotalCents: subtotal, shippingCents: shipping,
      totalCents: subtotal + shipping, currency, status: "TEST_PAID",
    },
  });

  // Decrement stock and refresh the comparison for each card.
  for (const d of decrements) {
    const l = await prisma.listing.update({
      where: { id: d.id },
      data: { quantity: { decrement: d.qty } },
      select: { id: true, quantity: true },
    });
    if (l.quantity <= 0) await prisma.listing.update({ where: { id: d.id }, data: { status: "SOLD" } });
    await syncListingToComparison(d.id);
  }

  return NextResponse.json({ ok: true, id: order.id });
}
