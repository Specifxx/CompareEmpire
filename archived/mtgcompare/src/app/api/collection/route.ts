import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// The signed-in user's saved collection (qty + optional cost basis per card).
// Logged-out users keep their localStorage collection only, so this returns an
// empty list for them.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const rows = await prisma.collectionItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { cardId: true, qty: true, costBasisCents: true, costCurrency: true },
  });
  return NextResponse.json({ items: rows });
}

const putSchema = z.object({
  items: z
    .array(
      z.object({
        cardId: z.string().min(1),
        qty: z.number().int().positive(),
        costBasisCents: z.number().int().positive().nullable().optional(),
        costCurrency: z.string().nullable().optional(),
      }),
    )
    .max(5000),
});

// Replace the user's whole saved collection with the given items (the merged set
// the client computes on sign-in + after every change). Mirrors the wishlist PUT.
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  // De-dupe by cardId (last write wins) so createMany never hits the unique index.
  const byId = new Map<string, { cardId: string; qty: number; costBasisCents: number | null; costCurrency: string | null }>();
  for (const it of parsed.data.items) {
    byId.set(it.cardId, {
      cardId: it.cardId,
      qty: it.qty,
      costBasisCents: it.costBasisCents ?? null,
      costCurrency: it.costCurrency ?? null,
    });
  }
  const items = Array.from(byId.values());

  await prisma.$transaction([
    prisma.collectionItem.deleteMany({ where: { userId: user.id } }),
    ...(items.length
      ? [
          prisma.collectionItem.createMany({
            data: items.map((it) => ({
              userId: user.id,
              cardId: it.cardId,
              qty: it.qty,
              costBasisCents: it.costBasisCents,
              costCurrency: it.costCurrency,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
  return NextResponse.json({ ok: true, count: items.length });
}
