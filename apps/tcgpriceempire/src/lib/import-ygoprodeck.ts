// Yu-Gi-Oh! singles via the YGOPRODeck v7 API — one request returns the whole
// TCG card database (~13-14k cards) with aggregated vendor prices, small enough
// to buffer.
//
// NOTE on images: card_images[].image_url points at YGOPRODeck's own CDN, and
// they forbid heavy hotlinking. Fine at launch traffic; mirroring images to our
// own CDN is a pre-scale TODO documented in SETUP.md.
import { buildSearchText, cardSlug } from "@/lib/catalog";
import {
  dollarsToCents,
  replaceVendorPrices,
  upsertCards,
  type CardRow,
  type VendorRow,
} from "@/lib/import-shared";

const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
const TIMEOUT_MS = 60_000;

type YgoCard = {
  id: number;
  name?: string;
  type?: string;
  card_sets?: { set_name?: string; set_code?: string; set_rarity?: string; set_price?: string }[];
  card_images?: { id: number; image_url?: string; image_url_small?: string }[];
  card_prices?: {
    cardmarket_price?: string;
    tcgplayer_price?: string;
    ebay_price?: string;
    amazon_price?: string;
    coolstuffinc_price?: string;
  }[];
  misc_info?: { tcg_date?: string }[];
};

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TCGPriceEmpire/1.0", Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`YGOPRODeck ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function importYgoprodeck(): Promise<{ cards: number; prices: number }> {
  const data = (await fetchJson(API_URL)) as { data?: YgoCard[] };
  const list = Array.isArray(data?.data) ? data.data : [];
  if (list.length === 0) throw new Error("YGOPRODeck: response had no cards — aborting before any write");
  console.log(`YGOPRODeck: ${list.length} cards fetched.`);

  const cards: CardRow[] = [];
  const prices: VendorRow[] = [];
  for (const c of list) {
    const name = c.name?.trim();
    if (!name || c.id == null) continue;
    const id = `yugioh:ygo:${c.id}`;
    // One Card row per card, not per printing — the first set listing stands in
    // for the card's identity (YGO reprints share one price feed anyway).
    const firstSet = c.card_sets?.[0];
    const setName = firstSet?.set_name ?? "Yu-Gi-Oh!";
    const p = c.card_prices?.[0];
    const marketPriceCents = dollarsToCents(p?.tcgplayer_price);
    cards.push({
      id,
      game: "yugioh",
      kind: "single",
      name,
      slug: cardSlug("yugioh", name, setName, String(c.id)),
      setName,
      setCode: firstSet?.set_code ?? null,
      collectorNumber: null,
      rarity: firstSet?.set_rarity ?? null,
      imageUrl: c.card_images?.[0]?.image_url ?? null,
      marketPriceCents,
      marketPriceSource: marketPriceCents != null ? "YGOPRODeck" : null,
      releaseDate: c.misc_info?.[0]?.tcg_date ?? null,
      searchText: buildSearchText(name, setName),
    });

    // YGOPRODeck aggregates each vendor's price but not a product URL, so the
    // rows carry RAW search URLs (affiliate wrapping happens at render time).
    const q = encodeURIComponent(name);
    const add = (vendor: string, vendorName: string, priceCents: number | null, currency: string, url: string) => {
      if (priceCents == null) return;
      prices.push({ cardId: id, vendor, vendorName, printing: "normal", priceCents, currency, url });
    };
    add("tcgplayer", "TCGplayer", dollarsToCents(p?.tcgplayer_price), "USD",
      `https://www.tcgplayer.com/search/yugioh/product?q=${q}`);
    add("cardmarket", "Cardmarket", dollarsToCents(p?.cardmarket_price), "EUR",
      `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${q}`);
    add("ebay", "eBay", dollarsToCents(p?.ebay_price), "USD",
      `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${name} yugioh`)}`);
    add("amazon", "Amazon", dollarsToCents(p?.amazon_price), "USD",
      `https://www.amazon.com/s?k=${encodeURIComponent(`${name} yugioh card`)}`);
    add("coolstuffinc", "CoolStuffInc", dollarsToCents(p?.coolstuffinc_price), "USD",
      `https://www.coolstuffinc.com/main_search.php?pa=searchOnName&page=1&resultsPerPage=25&q=${q}`);
  }

  const { created, updated } = await upsertCards(cards);
  // Scoped to this importer's id namespace so the TCGplayer sealed import for
  // yugioh and this one never wipe each other's rows.
  const written = await replaceVendorPrices("yugioh", prices, { cardIdPrefix: "yugioh:ygo:" });
  console.log(`YGOPRODeck: ${cards.length} cards (${created} new, ${updated} updated), ${written} vendor prices.`);
  return { cards: cards.length, prices: written };
}
