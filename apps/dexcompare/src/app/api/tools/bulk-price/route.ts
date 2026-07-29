import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeCountry, pickPrice, marketGuideCents } from "@/lib/country";
import { normalizeSearch } from "@/lib/format";
import { cardSearchFilter } from "@/lib/cards";

export const dynamic = "force-dynamic";

// Chunked server-side lookup for large paste/CSV lists — this is the per-chunk
// endpoint; the client (BulkPricerView) calls it in batches so a list in the
// thousands doesn't become one giant request.
const MAX_LINES = 200;

const schema = z.object({
  lines: z.array(z.string().min(1).max(200)).min(1).max(MAX_LINES),
  market: z.string().optional(),
});

export interface BulkPriceResult {
  input: string;
  matched: boolean;
  cardId: string | null;
  slug: string | null;
  name: string | null;
  setCode: string | null;
  collectorNumber: string | null;
  buyCents: number | null; // cheapest live store price
  buyStore: string | null;
  sellGuideCents: number | null; // TCGplayer market guide, for a sell-side reference
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { lines, market } = parsed.data;
  const country = normalizeCountry(market);

  const results: BulkPriceResult[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const norm = normalizeSearch(line);

    // Exact normalised-name match first (fast, unambiguous for "Charizard ex").
    let card = norm
      ? await prisma.card.findFirst({
          where: { nameNormalized: norm },
          orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
          select: {
            id: true, slug: true, name: true, setCode: true, collectorNumber: true,
            lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
            marketPriceCents: true, marketPriceSource: true,
            retailerPrices: {
              where: { country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
              orderBy: { priceCents: "asc" },
              take: 1,
              select: { retailerName: true, priceCents: true },
            },
          },
        })
      : null;

    // Fall back to the tokenised search used on /browse (handles "Charizard VSTAR promo").
    if (!card) {
      const filter = cardSearchFilter(line);
      if (filter) {
        card = await prisma.card.findFirst({
          where: filter,
          orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
          select: {
            id: true, slug: true, name: true, setCode: true, collectorNumber: true,
            lowestPriceCents: true, lowestPriceCentsUs: true, lowestPriceCentsGb: true,
            marketPriceCents: true, marketPriceSource: true,
            retailerPrices: {
              where: { country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
              orderBy: { priceCents: "asc" },
              take: 1,
              select: { retailerName: true, priceCents: true },
            },
          },
        });
      }
    }

    if (!card) {
      results.push({ input: line, matched: false, cardId: null, slug: null, name: null, setCode: null, collectorNumber: null, buyCents: null, buyStore: null, sellGuideCents: null });
      continue;
    }

    const cheapest = card.retailerPrices[0];
    const guideCents = card.marketPriceSource === "TCGplayer" ? marketGuideCents(card.marketPriceCents, country) : null;
    results.push({
      input: line,
      matched: true,
      cardId: card.id,
      slug: card.slug,
      name: card.name,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      buyCents: cheapest?.priceCents ?? pickPrice(card, country),
      buyStore: cheapest?.retailerName ?? null,
      sellGuideCents: guideCents,
    });
  }

  return NextResponse.json({ results });
}
