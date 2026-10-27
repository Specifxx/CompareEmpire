// Arbitrage finder, Pricempire-style: pick which sources count as the BUY side and
// which count as the SELL side, then see the cards with the biggest gap. By default
// you buy from the cheapest tracked store and sell on eBay, but either side can be
// any combination of stores and/or eBay. eBay's ~final-value fee is only netted off
// when the winning SELL source is eBay (selling to a store has no marketplace fee).
//
// Egress-bounded: a few groupBy aggregates rank everything; per-listing detail
// (urls/names) is fetched only for the page being shown.
import { prisma } from "./db";
import { marketGuideCents, type Country } from "./country";
import { RETAILERS } from "./retailers";
import { cardTileSelect } from "./cards";
import type { CardTileData } from "@/components/CardTile";

export const EBAY_FEE = 0.13; // approx eBay final-value fee
// TCGplayer seller cost: ~10.25% marketplace commission + ~2.5% payment
// processing. Applied when TCGplayer is the winning SELL side, the same way the
// eBay fee is — selling to a tracked retail store has no marketplace fee.
export const TCGPLAYER_FEE = 0.125;

// TCGplayer is the DEFAULT sell side. Unlike eBay (whose live listings we can
// only sample within a daily API quota, so coverage rotates through the
// catalogue), the TCGplayer market price is refreshed for every matched card —
// so the flip view has far better coverage pointed at TCGplayer.
//
// Its rows are always stored country="US" / currency="USD" (see lib/tcgplayer.ts),
// so for AU/GB viewers they're converted with the same indicative USD_FX rate the
// market-price guide uses, and labelled as a guide rather than a live local offer.
export const TCGPLAYER_KEY = "tcgplayer";
const MIN_BUY_CENTS = 300;
const MIN_NET_CENTS = 100;
// Outlier guard. A flip margin this large means the buy and sell aren't the same
// product (a mismatched/mispriced listing) — bad data, not a real opportunity.
const MAX_MARGIN_PCT = 300;

export type ArbSort = "profit" | "margin";

export interface ArbSource {
  key: string;
  name: string;
  isEbay: boolean;
  // TCGplayer is priced in USD and converted for non-US markets — the UI labels
  // it as a guide so it's never mistaken for a live local offer.
  isTcgplayer?: boolean;
}

// All selectable sources for a market: TCGplayer (the sell side) + its tracked
// stores. eBay is deliberately absent — OPCompare uses no eBay API, so there
// are no eBay price rows to compare against. eBay remains reachable from card
// pages as a plain affiliate SEARCH link, which carries no price we could rank.
export function getArbSources(country: Country): ArbSource[] {
  const stores = Object.values(RETAILERS)
    .filter((r) => (r.country ?? "AU") === country)
    .map((r) => ({ key: r.key, name: r.name, isEbay: false }));
  const tcg: ArbSource = { key: TCGPLAYER_KEY, name: "TCGplayer", isEbay: false, isTcgplayer: true };
  return [tcg, ...stores];
}

export interface ArbItem {
  card: CardTileData; // full tile data so the row can open the QuickView popup
  buyCents: number;
  buyStore: string;
  buyStoreName: string;
  buyUrl: string;
  sellCents: number; // gross sell price (cheapest on the sell side)
  sellName: string;
  sellUrl: string;
  sellIsEbay: boolean;
  // TCGplayer sell side: the figure is its USD market price converted at an
  // indicative rate, so the UI labels it rather than showing it as a live local offer.
  sellIsTcgplayer: boolean;
  netCents: number; // sell (less eBay fee if eBay) − buy
  marginPct: number;
}

export interface ArbPage {
  items: ArbItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

async function minByCard(country: Country, keys: string[]) {
  // TCGplayer is handled separately (its rows are US/USD regardless of the
  // viewer's market) — strip it so it can't be double-counted here.
  const local = keys.filter((k) => k !== TCGPLAYER_KEY);
  if (!local.length) return new Map<string, number>();
  const rows = await prisma.retailerPrice.groupBy({
    by: ["cardId"],
    where: { country, inStock: true, retailer: { in: local } },
    _min: { priceCents: true },
  });
  return new Map(rows.filter((r) => r._min.priceCents != null).map((r) => [r.cardId, r._min.priceCents!]));
}

// TCGplayer market prices, converted into the viewer's currency. The rows are
// always stored country="US"/USD, so this deliberately does NOT filter by the
// viewer's country — it converts instead, using the same indicative USD_FX rate
// as the on-card market-price guide (marketGuideCents), so the two never
// disagree with each other.
async function tcgplayerMinByCard(country: Country, keys: string[]) {
  if (!keys.includes(TCGPLAYER_KEY)) return new Map<string, number>();
  const rows = await prisma.retailerPrice.groupBy({
    by: ["cardId"],
    where: { country: "US", inStock: true, retailer: TCGPLAYER_KEY },
    _min: { priceCents: true },
  });
  const out = new Map<string, number>();
  for (const r of rows) {
    const usd = r._min.priceCents;
    if (usd == null) continue;
    const local = marketGuideCents(usd, country);
    if (local != null) out.set(r.cardId, local);
  }
  return out;
}

export async function getArbitrage(
  country: Country,
  opts: { buy: string[]; sell: string[]; sort: ArbSort; page?: number; pageSize?: number }
): Promise<ArbPage> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  try {
    const sources = getArbSources(country);
    const valid = new Set(sources.map((s) => s.key));
    const ebayKeys = new Set(sources.filter((s) => s.isEbay).map((s) => s.key));

    const buyKeys = opts.buy.filter((k) => valid.has(k));
    const sellKeys = opts.sell.filter((k) => valid.has(k));
    if (!buyKeys.length || !sellKeys.length) return { items: [], total: 0, page, pageSize, pageCount: 1 };

    const sellEbayKeys = sellKeys.filter((k) => ebayKeys.has(k));
    const sellStoreKeys = sellKeys.filter((k) => !ebayKeys.has(k) && k !== TCGPLAYER_KEY);

    const [buyMin, sellEbayMin, sellStoreMin, sellTcgMin] = await Promise.all([
      minByCard(country, buyKeys),
      minByCard(country, sellEbayKeys),
      minByCard(country, sellStoreKeys),
      tcgplayerMinByCard(country, sellKeys),
    ]);

    type Row = {
      cardId: string;
      buy: number;
      sellGross: number;
      sellIsEbay: boolean;
      sellIsTcg: boolean;
      net: number;
      margin: number;
    };
    const rows: Row[] = [];
    for (const [cardId, buy] of buyMin) {
      if (buy < MIN_BUY_CENTS) continue;
      const eg = sellEbayMin.get(cardId);
      const sg = sellStoreMin.get(cardId);
      const tg = sellTcgMin.get(cardId);
      // Best sell by NET: eBay and TCGplayer each net less their own marketplace
      // fee; selling to a tracked store is at face value.
      let sellGross: number | null = null;
      let sellNet: number | null = null;
      let sellIsEbay = false;
      let sellIsTcg = false;
      if (eg != null) {
        sellGross = eg;
        sellNet = Math.round(eg * (1 - EBAY_FEE));
        sellIsEbay = true;
      }
      if (tg != null) {
        const net = Math.round(tg * (1 - TCGPLAYER_FEE));
        if (sellNet == null || net > sellNet) {
          sellGross = tg;
          sellNet = net;
          sellIsEbay = false;
          sellIsTcg = true;
        }
      }
      if (sg != null && (sellNet == null || sg > sellNet)) {
        sellGross = sg;
        sellNet = sg;
        sellIsEbay = false;
        sellIsTcg = false;
      }
      if (sellGross == null || sellNet == null) continue;
      const net = sellNet - buy;
      if (net < MIN_NET_CENTS) continue;
      const margin = Math.round((net / buy) * 1000) / 10;
      if (margin > MAX_MARGIN_PCT) continue; // absurd flip margin = buy/sell mismatch, drop it
      rows.push({ cardId, buy, sellGross, sellIsEbay, sellIsTcg, net, margin });
    }
    rows.sort((a, b) => (opts.sort === "margin" ? b.margin - a.margin || b.net - a.net : b.net - a.net || b.margin - a.margin));

    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const p = Math.min(Math.max(1, page), pageCount);
    const slice = rows.slice((p - 1) * pageSize, p * pageSize);
    if (!slice.length) return { items: [], total, page: p, pageSize, pageCount };

    const ids = slice.map((r) => r.cardId);
    const wantsTcg = sellKeys.includes(TCGPLAYER_KEY);
    const [cards, buyListings, sellListings, tcgListings] = await Promise.all([
      prisma.card.findMany({ where: { id: { in: ids } }, select: cardTileSelect(country) }),
      prisma.retailerPrice.findMany({
        where: { cardId: { in: ids }, country, inStock: true, retailer: { in: buyKeys } },
        select: { cardId: true, retailer: true, retailerName: true, priceCents: true, url: true },
        orderBy: { priceCents: "asc" },
      }),
      prisma.retailerPrice.findMany({
        where: {
          cardId: { in: ids },
          country,
          inStock: true,
          retailer: { in: [...sellEbayKeys, ...sellStoreKeys] },
        },
        select: { cardId: true, retailer: true, retailerName: true, priceCents: true, url: true },
        orderBy: { priceCents: "asc" },
      }),
      // TCGplayer detail rows live under country="US" whatever the viewer's
      // market is, so they need their own fetch rather than the country-filtered
      // query above.
      wantsTcg
        ? prisma.retailerPrice.findMany({
            where: { cardId: { in: ids }, country: "US", inStock: true, retailer: TCGPLAYER_KEY },
            select: { cardId: true, retailer: true, retailerName: true, priceCents: true, url: true },
            orderBy: { priceCents: "asc" },
          })
        : Promise.resolve([] as { cardId: string; retailer: string; retailerName: string; priceCents: number; url: string }[]),
    ]);
    const cardMap = new Map(cards.map((c) => [c.id, c as unknown as CardTileData]));
    const bestBuy = new Map<string, (typeof buyListings)[number]>();
    for (const l of buyListings) if (!bestBuy.has(l.cardId)) bestBuy.set(l.cardId, l);

    // Cheapest sell listing on the WINNING side per card — three-way now
    // (TCGplayer / eBay / tracked store), matching whichever side actually won
    // the net comparison above.
    type Listing = (typeof buyListings)[number];
    const bestSell = new Map<string, Listing>();
    const bestTcg = new Map<string, Listing>();
    for (const l of tcgListings) if (!bestTcg.has(l.cardId)) bestTcg.set(l.cardId, l);
    const winner = new Map(slice.map((r) => [r.cardId, r.sellIsTcg ? "tcg" : r.sellIsEbay ? "ebay" : "store"]));
    for (const l of sellListings) {
      const want = winner.get(l.cardId);
      const side = ebayKeys.has(l.retailer) ? "ebay" : "store";
      if (want !== side) continue;
      if (!bestSell.has(l.cardId)) bestSell.set(l.cardId, l);
    }
    for (const [cardId, l] of bestTcg) {
      if (winner.get(cardId) === "tcg") bestSell.set(cardId, l);
    }

    const items = slice
      .map((r): ArbItem | null => {
        const c = cardMap.get(r.cardId);
        const b = bestBuy.get(r.cardId);
        const s = bestSell.get(r.cardId);
        if (!c || !b || !s) return null;
        return {
          card: c,
          buyCents: r.buy, buyStore: b.retailer, buyStoreName: b.retailerName, buyUrl: b.url,
          sellCents: r.sellGross, sellName: s.retailerName, sellUrl: s.url, sellIsEbay: r.sellIsEbay,
          sellIsTcgplayer: r.sellIsTcg,
          netCents: r.net, marginPct: r.margin,
        };
      })
      .filter((x): x is ArbItem => x !== null);

    return { items, total, page: p, pageSize, pageCount };
  } catch {
    return { items: [], total: 0, page, pageSize, pageCount: 1 };
  }
}
