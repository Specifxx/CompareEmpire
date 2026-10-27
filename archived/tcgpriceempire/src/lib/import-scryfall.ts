// Magic singles via Scryfall's "default_cards" bulk export.
//
// The bulk file is ~400+ MB of JSON, so it is streamed to a temp file and then
// parsed one card at a time with stream-json, flushing card rows to the DB
// every 2000 — memory stays flat no matter how big the catalogue grows.
// Scryfall requires an identifying User-Agent (anonymous requests get 403'd).
import { createReadStream, createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import { buildSearchText, cardSlug } from "@/lib/catalog";
import {
  dollarsToCents,
  replaceVendorPrices,
  upsertCards,
  type CardRow,
  type VendorRow,
} from "@/lib/import-shared";

const BULK_INDEX_URL = "https://api.scryfall.com/bulk-data";
const HEADERS = { "User-Agent": "TCGPriceEmpire/1.0", Accept: "application/json" };
const INDEX_TIMEOUT_MS = 60_000;
// The bulk file download deliberately gets a much longer budget than the usual
// 60s — 400+ MB on a slow runner would otherwise abort mid-stream.
const DOWNLOAD_TIMEOUT_MS = 15 * 60_000;
const FLUSH_EVERY = 2000;

// Layouts that aren't purchasable cards (tokens, emblems, art-series fillers).
const SKIP_LAYOUTS = new Set(["art_series", "token", "double_faced_token", "emblem"]);

type ScryfallCard = {
  id: string;
  name?: string;
  layout?: string;
  digital?: boolean;
  games?: string[];
  set?: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  released_at?: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { usd?: string | null; usd_foil?: string | null; eur?: string | null; eur_foil?: string | null };
  purchase_uris?: { tcgplayer?: string; cardmarket?: string };
};

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), INDEX_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Scryfall ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Stream the bulk body straight to disk — buffering 400+ MB in memory is how
// CI runners die.
async function downloadToTemp(url: string): Promise<string> {
  const path = join(tmpdir(), `scryfall-default-cards-${process.pid}-${Date.now()}.json`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(`Scryfall bulk download ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as unknown as WebReadableStream), createWriteStream(path));
    return path;
  } finally {
    clearTimeout(timer);
  }
}

// Paper-only filter + Card row mapping. Returns null for anything we don't
// catalogue (digital-only, non-paper, token-ish layouts).
function toCardRow(c: ScryfallCard): CardRow | null {
  const name = c.name?.trim();
  if (!name || !c.id) return null;
  if (c.digital === true) return null;
  if (!Array.isArray(c.games) || !c.games.includes("paper")) return null;
  if (SKIP_LAYOUTS.has(c.layout ?? "")) return null;
  const setName = c.set_name ?? "";
  // usd, falling back to usd_foil for foil-only printings — better a foil
  // headline than no headline.
  const marketPriceCents = dollarsToCents(c.prices?.usd) ?? dollarsToCents(c.prices?.usd_foil);
  return {
    id: `magic:scry:${c.id}`,
    game: "magic",
    kind: "single",
    name,
    // collector number alone repeats across sets — the set code makes the
    // trailing identity segment unique per printing.
    slug: cardSlug("magic", name, setName, `${c.collector_number ?? ""}-${c.set ?? ""}`),
    setName,
    setCode: c.set ?? null,
    collectorNumber: c.collector_number ?? null,
    rarity: c.rarity ?? null,
    imageUrl: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
    marketPriceCents,
    marketPriceSource: marketPriceCents != null ? "Scryfall" : null,
    releaseDate: c.released_at ?? null,
    searchText: buildSearchText(name, setName),
  };
}

// Vendor rows need BOTH a parsed price and a vendor URL — a priced row with no
// purchase_uri would render as a dead compare link. Scryfall's bulk data only
// carries purchase_uris on a fraction of cards (observed: ~15% on the first full
// run), so fall back to a vendor SEARCH url — same pattern as the Yu-Gi-Oh!
// importer — rather than dropping the comparison for ~80k priced cards.
function pushVendorRows(out: VendorRow[], cardId: string, c: ScryfallCard): void {
  // Front-face name for double-faced cards ("Fable of the Mirror-Breaker // …").
  const q = encodeURIComponent((c.name ?? "").split(" // ")[0]);
  const tcgUrl = c.purchase_uris?.tcgplayer ?? `https://www.tcgplayer.com/search/magic/product?q=${q}`;
  const cmUrl = c.purchase_uris?.cardmarket ?? `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${q}`;
  const add = (
    vendor: string,
    vendorName: string,
    printing: string,
    priceCents: number | null,
    currency: string,
    url: string | undefined
  ) => {
    if (priceCents == null || !url) return;
    out.push({ cardId, vendor, vendorName, printing, priceCents, currency, url });
  };
  add("tcgplayer", "TCGplayer", "normal", dollarsToCents(c.prices?.usd), "USD", tcgUrl);
  add("tcgplayer", "TCGplayer", "foil", dollarsToCents(c.prices?.usd_foil), "USD", tcgUrl);
  add("cardmarket", "Cardmarket", "normal", dollarsToCents(c.prices?.eur), "EUR", cmUrl);
  add("cardmarket", "Cardmarket", "foil", dollarsToCents(c.prices?.eur_foil), "EUR", cmUrl);
}

export async function importScryfall(): Promise<{ cards: number; prices: number }> {
  const index = (await fetchJson(BULK_INDEX_URL)) as {
    data?: { type?: string; download_uri?: string; size?: number; updated_at?: string }[];
  };
  const entry = (index?.data ?? []).find((d) => d?.type === "default_cards");
  if (!entry?.download_uri) throw new Error("Scryfall bulk-data: no default_cards entry found");
  console.log(
    `Scryfall: downloading default_cards (~${Math.round((entry.size ?? 0) / 1e6)} MB, updated ${entry.updated_at ?? "?"}).`
  );
  const tmp = await downloadToTemp(entry.download_uri);

  let batch: CardRow[] = [];
  // Vendor rows are held for the whole run: replaceVendorPrices is
  // delete-then-create, so it needs the complete set. ~400-500k small objects —
  // fine; it's the CARD rows (much heavier) that flush incrementally.
  const vendorRows: VendorRow[] = [];
  let cards = 0;
  let created = 0;
  let updated = 0;
  try {
    const source = createReadStream(tmp);
    const jsonParser = parser();
    const arrayStream = streamArray();
    // .pipe() does not forward errors — route them into the stream we iterate
    // so a truncated download rejects the loop instead of hanging it.
    source.on("error", (e) => arrayStream.destroy(e));
    jsonParser.on("error", (e) => arrayStream.destroy(e));
    source.pipe(jsonParser).pipe(arrayStream);

    for await (const item of arrayStream as AsyncIterable<{ value: ScryfallCard }>) {
      const row = toCardRow(item.value);
      if (!row) continue;
      cards++;
      batch.push(row);
      pushVendorRows(vendorRows, row.id, item.value);
      if (batch.length >= FLUSH_EVERY) {
        const r = await upsertCards(batch);
        created += r.created;
        updated += r.updated;
        batch = [];
      }
    }
    if (batch.length > 0) {
      const r = await upsertCards(batch);
      created += r.created;
      updated += r.updated;
    }
  } finally {
    await unlink(tmp).catch(() => {}); // best-effort temp cleanup
  }

  const written = await replaceVendorPrices("magic", vendorRows, { cardIdPrefix: "magic:scry:" });
  console.log(`Scryfall: ${cards} paper cards (${created} new, ${updated} updated), ${written} vendor prices.`);
  return { cards, prices: written };
}
