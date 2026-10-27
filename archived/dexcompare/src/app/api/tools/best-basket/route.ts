import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCountry } from "@/lib/country";

export const dynamic = "force-dynamic";

// Cap the basket size — this runs a real per-request query, not an unbounded scan,
// but a want-list of thousands would be a genuinely unreasonable single request.
const MAX_CARDS = 300;

const schema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(MAX_CARDS),
  market: z.string().optional(),
});

interface StoreLine {
  retailer: string;
  retailerName: string;
  priceCents: number;
  url: string;
}

// Cheapest single store vs a split basket for a want list — wired to the
// wishlist (P4). No price history needed: every figure here is today's live
// RetailerPrice data. The split side is a documented greedy heuristic
// (cheapest store per card, independently) — not a true assignment-problem
// optimum, but a correct lower bound and the number that actually matters to
// a buyer ("what's the cheapest I could pay if I don't mind multiple parcels").
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { cardIds, market } = parsed.data;
  const country = normalizeCountry(market);

  const [cards, rows] = await Promise.all([
    prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, slug: true, name: true, setCode: true, setName: true, collectorNumber: true },
    }),
    prisma.retailerPrice.findMany({
      where: {
        cardId: { in: cardIds },
        country,
        inStock: true,
        NOT: { retailer: { startsWith: "marketguide" } },
      },
      orderBy: { priceCents: "asc" },
      select: { cardId: true, retailer: true, retailerName: true, priceCents: true, url: true },
    }),
  ]);

  const byCard = new Map<string, StoreLine[]>();
  for (const r of rows) {
    const list = byCard.get(r.cardId) ?? [];
    list.push(r);
    byCard.set(r.cardId, list);
  }

  // ---- Split basket: cheapest store per card, independently ----------------
  const splitLines = cardIds
    .map((id) => {
      const card = cards.find((c) => c.id === id);
      const cheapest = byCard.get(id)?.[0]; // already sorted asc
      if (!card) return null;
      return { card, line: cheapest ?? null };
    })
    .filter((x): x is { card: (typeof cards)[number]; line: StoreLine | null } => x !== null);
  const splitTotalCents = splitLines.reduce((s, l) => s + (l.line?.priceCents ?? 0), 0);
  const splitFoundCount = splitLines.filter((l) => l.line != null).length;
  const splitStoreCount = new Set(splitLines.map((l) => l.line?.retailer).filter(Boolean)).size;

  // ---- Best single store: the store covering the most cards, cheapest total ----
  const retailerTotals = new Map<string, { retailerName: string; totalCents: number; count: number }>();
  for (const [cardId, lines] of byCard) {
    for (const line of lines) {
      const cur = retailerTotals.get(line.retailer) ?? { retailerName: line.retailerName, totalCents: 0, count: 0 };
      cur.totalCents += line.priceCents;
      cur.count += 1;
      retailerTotals.set(line.retailer, cur);
    }
  }
  let bestSingle: { retailer: string; retailerName: string; totalCents: number; count: number } | null = null;
  for (const [retailer, v] of retailerTotals) {
    if (
      !bestSingle ||
      v.count > bestSingle.count ||
      (v.count === bestSingle.count && v.totalCents < bestSingle.totalCents)
    ) {
      bestSingle = { retailer, ...v };
    }
  }

  return NextResponse.json({
    requested: cardIds.length,
    split: {
      totalCents: splitTotalCents,
      foundCount: splitFoundCount,
      storeCount: splitStoreCount,
      lines: splitLines.map((l) => ({
        cardId: l.card.id,
        slug: l.card.slug,
        name: l.card.name,
        setCode: l.card.setCode,
        collectorNumber: l.card.collectorNumber,
        retailerName: l.line?.retailerName ?? null,
        priceCents: l.line?.priceCents ?? null,
        url: l.line?.url ?? null,
      })),
    },
    bestSingle: bestSingle && {
      retailerName: bestSingle.retailerName,
      totalCents: bestSingle.totalCents,
      coveredCount: bestSingle.count,
    },
  });
}
