// TCGplayer catalogue importer — one game per call.
//
// pokemon / onepiece / riftbound: BOTH singles and sealed come from TCGplayer
// (it is the only structured source covering them). magic / yugioh: ONLY the
// sealed catalogue — their singles come from Scryfall / YGOPRODeck, which carry
// far better identities (stable card ids, collector numbers, multi-vendor
// prices) than TCGplayer's search rows.
import { GAMES, type GameKey } from "@/lib/games";
import { buildSearchText, cardSlug } from "@/lib/catalog";
import { fetchAllProducts, tcgImageUrl, tcgProductUrl, type TcgProduct } from "@/lib/tcgplayer";
import {
  dollarsToCents,
  replaceVendorPrices,
  upsertCards,
  type CardRow,
  type VendorRow,
} from "@/lib/import-shared";

const SEALED_ONLY: ReadonlySet<GameKey> = new Set(["magic", "yugioh"]);

export async function importTcgplayerGame(game: GameKey): Promise<{ cards: number; prices: number }> {
  const line = GAMES[game].tcgProductLine;
  const batches: { productTypes: string[]; sealedFetch: boolean }[] = SEALED_ONLY.has(game)
    ? [{ productTypes: ["Sealed Products"], sealedFetch: true }]
    : [
        { productTypes: ["Cards"], sealedFetch: false },
        { productTypes: ["Sealed Products"], sealedFetch: true },
      ];

  // Keyed by card id — a product surfacing in both fetches must not duplicate.
  const cards = new Map<string, CardRow>();
  const prices: VendorRow[] = [];

  for (const batch of batches) {
    let products: TcgProduct[];
    try {
      products = await fetchAllProducts(line, batch.productTypes);
    } catch (e) {
      // The other product type may still succeed — don't abort the game.
      console.warn(`TCGplayer[${game}] ${batch.productTypes.join("/")} fetch failed: ${(e as Error).message}`);
      continue;
    }
    console.log(`TCGplayer[${game}] ${batch.productTypes.join("/")}: ${products.length} products fetched.`);

    for (const p of products) {
      const name = p.productName?.trim();
      if (!name) continue; // nameless rows can't be slugged, searched or shown
      const id = `${game}:tcg:${p.productId}`;
      const setName = p.setName ?? "";
      const marketPriceCents = dollarsToCents(p.marketPrice);
      cards.set(id, {
        id,
        game,
        kind: p.sealed || batch.sealedFetch ? "sealed" : "single",
        name,
        slug: cardSlug(game, name, setName, p.customAttributes?.number || String(p.productId)),
        setName,
        setCode: null,
        collectorNumber: p.customAttributes?.number ?? null,
        rarity: null, // the search API doesn't expose rarity
        imageUrl: tcgImageUrl(p.productId),
        marketPriceCents,
        marketPriceSource: marketPriceCents != null ? "TCGplayer" : null,
        releaseDate: p.customAttributes?.releaseDate ?? null,
        searchText: buildSearchText(name, setName),
      });
      // Unpriced products stay in the catalogue (the UI gives them eBay search
      // links), but only a real market price earns a vendor row.
      if (marketPriceCents != null) {
        prices.push({
          cardId: id,
          vendor: "tcgplayer",
          vendorName: "TCGplayer",
          printing: p.foilOnly ? "foil" : "normal",
          priceCents: marketPriceCents,
          currency: "USD",
          url: tcgProductUrl(p),
        });
      }
    }
  }

  const rows = [...cards.values()];
  const { created, updated } = await upsertCards(rows);
  // Scoped to this importer's id namespace so the magic/yugioh sealed import
  // never wipes the Scryfall/YGOPRODeck singles' vendor rows.
  const written = await replaceVendorPrices(game, prices, { cardIdPrefix: `${game}:tcg:` });
  console.log(`TCGplayer[${game}]: ${rows.length} cards (${created} new, ${updated} updated), ${written} vendor prices.`);
  return { cards: rows.length, prices: written };
}
