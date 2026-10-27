import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { cardTileSelect } from "./cards";
import type { Country } from "./country";
import type { CardTileData } from "@/components/CardTile";

// "Deals" — cards whose cheapest LIVE store price sits meaningfully below the
// TCGplayer market guide. This is the purest expression of what the site is
// for: the same card, genuinely cheaper somewhere we track.
//
// The ranking (guard rails: guide must be a REAL TCGplayer price, 15%-70% off
// only, local price >= $2) is computed by the importer — see the Deal model and
// price-import.ts. This used to be a full-catalogue scan on every cache miss
// (~6-12 MB/request, the single largest source of this site's Neon egress);
// now it's a `take`-capped read of a ~400-row precomputed table.
export interface Deal {
  card: CardTileData;
  pct: number; // % below the market guide, e.g. 38
  priceCents: number; // cheapest live local price
  guideCents: number; // TCGplayer guide converted to the local currency
}

async function computeDeals(country: Country, limit: number): Promise<Deal[]> {
  const rows = await prisma.deal.findMany({
    where: { country },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      pct: true,
      priceCents: true,
      guideCents: true,
      card: { select: cardTileSelect(country) },
    },
  });
  return rows.map((r) => ({
    card: r.card as CardTileData,
    pct: r.pct,
    priceCents: r.priceCents,
    guideCents: r.guideCents,
  }));
}

// Cached per market — cheap either way now, but this avoids re-reading on every
// request during a traffic burst.
export async function getTopDeals(limit = 60, country: Country = "AU"): Promise<Deal[]> {
  return unstable_cache(() => computeDeals(country, limit), ["top-deals", country, String(limit)], {
    revalidate: 900,
  })();
}
