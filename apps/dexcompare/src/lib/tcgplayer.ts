// TCGplayer as a US price source.
//
// TCGplayer is the dominant US marketplace, so its prices belong in the US
// comparison. We deliberately use each product's MARKET PRICE (the algorithmic
// fair-market value for English/NM), NOT the lowest listing — the cheapest
// listing is frequently a different-language card and badly misrepresents the
// real price. Market price is the number TCGplayer itself headlines.
//
// Data comes from TCGplayer's public search API (the same endpoint the website
// uses). Products are matched to our cards by collector number + set, reusing
// the importer's exact numKey/setFromTotal logic so a Signature/alt-art print is
// never collapsed onto its base card.
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const SEARCH_URL = "https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false";
const PRODUCT_LINE = "pokemon";
const PAGE_SIZE = 50;

// Mirror of price-import.ts numKey: strip leading zeros, lowercase any letter
// prefix/suffix (Pokémon promos like "SWSH262"/"SVP 044" keep their alpha prefix
// as part of the identity), and mark a "*" print with a trailing "s".
function numKey(seg: string): string {
  const cleaned = seg.trim().toLowerCase().replace(/\s+/g, "");
  const m = cleaned.match(/^([a-z]*)0*(\d+)([a-z]*)/);
  const base = m ? m[1] + m[2] + m[3] : cleaned;
  return seg.includes("*") ? `${base}s` : base;
}

// Normalised set name for cross-catalogue matching. TCGplayer prefixes set names
// with the series code ("SV03: Obsidian Flames"); our names come from
// pokemontcg.io ("Obsidian Flames"). Lowercase, fold "&"→"and", strip everything
// but letters/digits/spaces, collapse whitespace — then one side containing the
// other counts as the same set (the collector number must ALSO match, so a name
// overlap alone can never mis-match a card).
function normSetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setNamesOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export type TcgProduct = {
  productId: number;
  productName: string;
  productUrlName: string;
  setUrlName: string;
  productLineUrlName: string;
  setName: string;
  marketPrice: number | null;
  lowestPrice: number | null;
  foilOnly: boolean;
  sealed: boolean;
  customAttributes?: { number?: string };
};

function searchBody(from: number, productTypeName?: string[]) {
  const term: Record<string, string[]> = { productLineName: [PRODUCT_LINE] };
  if (productTypeName) term.productTypeName = productTypeName;
  return {
    algorithm: "sales_synonym_v2",
    from,
    size: PAGE_SIZE,
    filters: { term, range: {}, match: {} },
    listingSearch: {
      context: { cart: {} },
      filters: { term: { sellerStatus: "Live", channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } },
    },
    context: { cart: {}, shippingCountry: "US", userProfile: {} },
    settings: { useFuzzySearch: true, didYouMean: {} },
    sort: {},
  };
}

async function fetchPage(from: number, productTypeName?: string[]): Promise<{ items: TcgProduct[]; total: number }> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://www.tcgplayer.com",
      Referer: "https://www.tcgplayer.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    body: JSON.stringify(searchBody(from, productTypeName)),
  });
  if (!res.ok) throw new Error(`TCGplayer search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  const r = data?.results?.[0];
  return { items: (r?.results ?? []) as TcgProduct[], total: r?.totalResults ?? 0 };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch every Pokémon card product (paginated), excluding sealed products.
export async function fetchTcgplayerProducts(): Promise<TcgProduct[]> {
  const first = await fetchPage(0);
  const out: TcgProduct[] = [...first.items];
  for (let from = PAGE_SIZE; from < first.total; from += PAGE_SIZE) {
    await sleep(250);
    try {
      const pg = await fetchPage(from);
      if (pg.items.length === 0) break;
      out.push(...pg.items);
    } catch (e) {
      console.warn(`TCGplayer page from=${from} failed:`, (e as Error).message);
      break;
    }
  }
  return out.filter((p) => !p.sealed);
}

// Fetch the SEALED product catalogue (booster boxes/cases, packs, Champion Decks,
// Nexus Night promo packs, Pre-Rift kits, …) — a separate product type from cards.
export async function fetchTcgplayerSealed(): Promise<TcgProduct[]> {
  const PT = ["Sealed Products"];
  const first = await fetchPage(0, PT);
  const out: TcgProduct[] = [...first.items];
  for (let from = PAGE_SIZE; from < first.total; from += PAGE_SIZE) {
    await sleep(250);
    try {
      const pg = await fetchPage(from, PT);
      if (pg.items.length === 0) break;
      out.push(...pg.items);
    } catch (e) {
      console.warn(`TCGplayer sealed page from=${from} failed:`, (e as Error).message);
      break;
    }
  }
  return out;
}

export function tcgProductUrl(p: TcgProduct): string {
  const slug = `${p.productLineUrlName ?? "pokemon"}-${p.setUrlName ?? ""}-${p.productUrlName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.tcgplayer.com/product/${p.productId}/${slug}`;
}

// TCGplayer product image CDN.
export function tcgImageUrl(productId: number): string {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`;
}

export type TcgMatchResult = {
  total: number;
  matched: number;
  rows: Prisma.RetailerPriceCreateManyInput[];
  unmatchedSamples: string[];
  // cardId → TCGplayer market price (USD cents) for the base/non-foil printing.
  marketByCard: Map<string, number>;
};

// Match products to cards and build RetailerPrice rows (no DB writes — caller
// decides). Exported separately so a dry-run can inspect the match quality.
//
// Matching: collector number is the primary identity (numKey, letter-aware), with
// the SET confirmed by name overlap and — when both sides print one — an equal
// "/total" denominator. Ambiguous products (number matching multiple cards whose
// set names all overlap) are skipped rather than guessed.
export async function buildTcgplayerRows(products?: TcgProduct[]): Promise<TcgMatchResult> {
  const items = products ?? (await fetchTcgplayerProducts());
  const cards = await prisma.card.findMany({ select: { id: true, collectorNumber: true, setName: true } });
  // numKey → candidate cards (the same number recurs across sets; the set-name
  // overlap picks the right one).
  const byNum = new Map<string, { id: string; setNorm: string; total: string | null }[]>();
  for (const c of cards) {
    const [num, total] = c.collectorNumber.split("/");
    const k = numKey(num);
    const list = byNum.get(k) ?? [];
    list.push({ id: c.id, setNorm: normSetName(c.setName), total: total?.trim() || null });
    byNum.set(k, list);
  }

  const rows: Prisma.RetailerPriceCreateManyInput[] = [];
  // Per card+printing, the market price for the Card.marketPriceCents guide refresh
  // (base/non-foil preferred — that's the price the guide represents).
  const marketByCard = new Map<string, number>();
  const seen = new Set<string>();
  const unmatchedSamples: string[] = [];
  let matched = 0;

  for (const p of items) {
    const numStr = p.customAttributes?.number;
    const market = p.marketPrice;
    if (!numStr || market == null || market <= 0) continue;
    const [num, total] = numStr.split("/");
    const prodSetNorm = normSetName(p.setName ?? "");
    const prodTotal = total?.trim() || null;
    const candidates = (byNum.get(numKey(num)) ?? []).filter(
      (c) => setNamesOverlap(c.setNorm, prodSetNorm) && (!c.total || !prodTotal || c.total === prodTotal)
    );
    if (candidates.length !== 1) {
      if (!candidates.length && unmatchedSamples.length < 25) {
        unmatchedSamples.push(`${p.productName} [${p.setName}] ${numStr} $${market}`);
      }
      continue;
    }
    const cardId = candidates[0].id;
    matched++;
    // foilOnly products are foil prints; everything else is the base/normal market.
    const isFoil = !!p.foilOnly;
    if (!isFoil && !marketByCard.has(cardId)) marketByCard.set(cardId, Math.round(market * 100));
    const dedupe = `${cardId}|${isFoil}`;
    if (seen.has(dedupe)) continue; // one row per card+printing (unique key)
    seen.add(dedupe);
    rows.push({
      cardId,
      retailer: "tcgplayer",
      retailerName: "TCGplayer",
      title: p.productName,
      url: tcgProductUrl(p),
      condition: "NM",
      isFoil,
      priceCents: Math.round(market * 100),
      currency: "USD",
      country: "US",
      inStock: true,
    });
  }
  return { total: items.length, matched, rows, unmatchedSamples, marketByCard };
}

// Refresh each matched card's MARKET-PRICE GUIDE (Card.marketPriceCents, USD)
// from TCGplayer's live market price, recording the source + timestamp so the UI
// can always say where the guide came from. Diff-based: only cards whose guide
// actually moved are written.
async function refreshMarketGuides(marketByCard: Map<string, number>): Promise<number> {
  if (marketByCard.size === 0) return 0;
  const current = await prisma.card.findMany({
    where: { id: { in: Array.from(marketByCard.keys()) } },
    select: { id: true, marketPriceCents: true, marketPriceSource: true },
  });
  const toUpdate = current.filter((c) => {
    const next = marketByCard.get(c.id)!;
    return c.marketPriceCents !== next || c.marketPriceSource !== "TCGplayer";
  });
  const CONC = 8;
  for (let i = 0; i < toUpdate.length; i += CONC) {
    await Promise.all(
      toUpdate.slice(i, i + CONC).map((c) =>
        prisma.card.update({
          where: { id: c.id },
          data: {
            marketPriceCents: marketByCard.get(c.id)!,
            marketPriceSource: "TCGplayer",
            marketPriceUpdatedAt: new Date(),
          },
        })
      )
    );
  }
  return toUpdate.length;
}

// Replace all TCGplayer rows with a fresh pull. Returns the number written.
export async function refreshTcgplayerPrices(): Promise<number> {
  const { total, matched, rows, unmatchedSamples, marketByCard } = await buildTcgplayerRows();
  console.log(`TCGplayer: ${total} products, ${matched} matched, ${rows.length} rows.`);
  if (unmatchedSamples.length) console.log(`TCGplayer unmatched (sample): ${unmatchedSamples.slice(0, 8).join(" | ")}`);
  if (rows.length === 0) {
    console.warn("TCGplayer: 0 rows built — keeping existing rows.");
    return 0;
  }
  await prisma.retailerPrice.deleteMany({ where: { retailer: "tcgplayer" } });
  await prisma.retailerPrice.createMany({ data: rows });
  const guides = await refreshMarketGuides(marketByCard);
  if (guides) console.log(`TCGplayer: refreshed the market-price guide on ${guides} cards.`);
  return rows.length;
}
