import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { currencyOfCountry, syncListingToComparison } from "@/lib/marketplace";

const schema = z.object({
  cardId: z.string().min(1),
  condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  isFoil: z.boolean().default(false),
  priceCents: z.number().int().positive().max(100_000_00),
  quantity: z.number().int().min(1).max(999).default(1),
  country: z.enum(["AU", "NZ", "US", "GB"]).default("AU"),
  shipCents: z.number().int().min(0).max(10_000_00).nullable().optional(),
});

// A verified seller's own active listings.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ listings: [] });
  const listings = await prisma.listing.findMany({
    where: { sellerId: user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: { card: { select: { name: true, collectorNumber: true, setName: true, imageThumbUrl: true } } },
  });
  return NextResponse.json({ listings });
}

// Create a listing. Marketplace listings may only be created by verified sellers.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.verifiedSeller) return NextResponse.json({ error: "Verified sellers only" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
  const d = parsed.data;
  const card = await prisma.card.findUnique({ where: { id: d.cardId }, select: { id: true } });
  if (!card) return NextResponse.json({ error: "Unknown card" }, { status: 400 });

  const listing = await prisma.listing.create({
    data: {
      cardId: d.cardId, sellerId: user.id, condition: d.condition, isFoil: d.isFoil,
      priceCents: d.priceCents, quantity: d.quantity, country: d.country,
      currency: currencyOfCountry(d.country), shipCents: d.shipCents ?? null, status: "ACTIVE",
    },
  });
  await syncListingToComparison(listing.id);
  return NextResponse.json({ ok: true, id: listing.id });
}
