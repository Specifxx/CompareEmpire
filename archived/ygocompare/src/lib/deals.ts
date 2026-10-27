import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { cardTileSelect } from "./cards";
import { marketGuideCents, pickPrice, priceField, type Country } from "./country";
import type { CardTileData } from "@/components/CardTile";

// "Deals" — cards whose cheapest LIVE store price sits meaningfully below the
// TCGplayer market guide. This is the purest expression of what the site is
// for: the same card, genuinely cheaper somewhere we track.
//
// Guard rails (accuracy beats excitement):
//   - guide must be REAL (marketPriceSource = TCGplayer, never the heuristic),
//   - 15%–70% off only — deeper than 70% almost always means a wrong-card
//     match or foreign print (the same floor the accuracy CI polices),
//   - local price >= $2 so penny-card noise never tops the list.
export interface Deal {
  card: CardTileData;
  pct: number; // % below the market guide, e.g. 38
  priceCents: number; // cheapest live local price
  guideCents: number; // TCGplayer guide converted to the local currency
}

async function computeDeals(country: Country, limit: number): Promise<Deal[]> {
  const field = priceField(country);
  const cards = (await prisma.card.findMany({
    where: { marketPriceSource: "TCGplayer", marketPriceCents: { gt: 0 }, [field]: { not: null } },
    select: cardTileSelect(country),
  })) as CardTileData[];

  const deals: Deal[] = [];
  for (const c of cards) {
    const price = pickPrice(c, country);
    const guide = marketGuideCents(c.marketPriceCents, country);
    if (price == null || guide == null || price < 200) continue;
    const pct = 1 - price / guide;
    if (pct < 0.15 || pct > 0.7) continue;
    deals.push({ card: c, pct: Math.round(pct * 100), priceCents: price, guideCents: guide });
  }
  // Deepest discount first; ties → the more valuable card (a 30%-off $80 card
  // beats a 30%-off $3 card for every segment we serve).
  return deals.sort((a, b) => b.pct - a.pct || b.priceCents - a.priceCents).slice(0, limit);
}

// Cached per market — the scan walks every guided card, and prices only move
// on the daily import anyway.
export async function getTopDeals(limit = 60, country: Country = "AU"): Promise<Deal[]> {
  return unstable_cache(() => computeDeals(country, limit), ["top-deals", country, String(limit)], {
    revalidate: 900,
  })();
}
