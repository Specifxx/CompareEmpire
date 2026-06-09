import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { syncListingToComparison } from "@/lib/marketplace";

// Cancel one of your own listings (removes it from the price comparison too).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const listing = await prisma.listing.findUnique({ where: { id: params.id }, select: { id: true, sellerId: true } });
  if (!listing || listing.sellerId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.listing.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  await syncListingToComparison(params.id);
  return NextResponse.json({ ok: true });
}
