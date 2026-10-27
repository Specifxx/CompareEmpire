// Shared DB write strategy — every importer funnels through these helpers so
// the diff-based upsert, the "an empty fetch must never wipe good data" guard
// and the daily history snapshot stay one implementation across five games.
import { prisma } from "@/lib/db";
import type { GameKey } from "@/lib/games";

// Prisma Card create input minus the timestamps (DB defaults handle those).
// Kept scalar-only on purpose: createMany cannot take relation writes.
export type CardRow = {
  id: string;
  game: GameKey;
  kind: "single" | "sealed";
  name: string;
  slug: string;
  setName: string;
  setCode?: string | null;
  collectorNumber?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
  marketPriceCents?: number | null;
  marketPriceSource?: string | null;
  releaseDate?: string | null;
  searchText: string;
};

export type VendorRow = {
  cardId: string;
  vendor: string; // tcgplayer | cardmarket | ebay | amazon | coolstuffinc
  vendorName: string;
  printing: string; // normal | foil
  priceCents: number;
  currency: string; // USD | EUR
  url: string; // RAW vendor url — affiliate wrapping happens at render time
};

// Robust dollars→cents: source prices arrive as strings ("0.25") or numbers,
// and occasionally as garbage. NaN, zero/negative, or absurd values (> $500k —
// data glitches, not cards) must become "no price", never a bogus headline.
export function dollarsToCents(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!Number.isFinite(n) || n <= 0 || n > 500_000) return null;
  return Math.round(n * 100);
}

// Tiny stable hash for slug de-collision — only has to be deterministic and
// short, not cryptographic.
function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const FIND_CHUNK = 5000; // id IN (...) lookup size
const CREATE_CHUNK = 1000;
const UPDATE_CONC = 10;
const VENDOR_CHUNK = 2000;
const HISTORY_CHUNK = 10_000;

// Diff-based upsert: createMany for new ids, individual updates only for rows
// whose price or image actually moved. A full-catalogue blind upsert would be
// ~100k row writes per game per night for data that mostly didn't change.
export async function upsertCards(rows: CardRow[]): Promise<{ created: number; updated: number }> {
  if (rows.length === 0) return { created: 0, updated: 0 };

  // De-dupe by id (last wins), then de-collide slugs: createMany with
  // skipDuplicates would silently DROP a new row whose slug collides with a
  // different id — an ugly hash-suffixed URL beats a missing card. Copies, so
  // callers' rows are never mutated.
  const byId = new Map<string, CardRow>();
  for (const r of rows) byId.set(r.id, { ...r });
  const unique = [...byId.values()];
  const slugOwner = new Map<string, string>();
  for (const r of unique) {
    const owner = slugOwner.get(r.slug);
    if (owner !== undefined && owner !== r.id) {
      r.slug = `${r.slug.slice(0, 130)}-${shortHash(r.id)}`;
    }
    slugOwner.set(r.slug, r.id);
  }

  const existing = new Map<string, { marketPriceCents: number | null; imageUrl: string | null }>();
  for (let i = 0; i < unique.length; i += FIND_CHUNK) {
    const ids = unique.slice(i, i + FIND_CHUNK).map((r) => r.id);
    const found = await prisma.card.findMany({
      where: { id: { in: ids } },
      select: { id: true, marketPriceCents: true, imageUrl: true },
    });
    for (const f of found) existing.set(f.id, { marketPriceCents: f.marketPriceCents, imageUrl: f.imageUrl });
  }

  const fresh = unique.filter((r) => !existing.has(r.id));
  const changed = unique.filter((r) => {
    const e = existing.get(r.id);
    if (!e) return false;
    return (r.marketPriceCents ?? null) !== e.marketPriceCents || (r.imageUrl ?? null) !== e.imageUrl;
  });

  for (let i = 0; i < fresh.length; i += CREATE_CHUNK) {
    await prisma.card.createMany({ data: fresh.slice(i, i + CREATE_CHUNK), skipDuplicates: true });
  }

  for (let i = 0; i < changed.length; i += UPDATE_CONC) {
    await Promise.all(
      changed.slice(i, i + UPDATE_CONC).map((r) =>
        prisma.card.update({
          where: { id: r.id },
          // Only the volatile fields — slug/name stay untouched so card URLs
          // never churn under Google's feet.
          data: {
            marketPriceCents: r.marketPriceCents ?? null,
            marketPriceSource: r.marketPriceSource ?? null,
            imageUrl: r.imageUrl ?? null,
          },
        })
      )
    );
  }
  return { created: fresh.length, updated: changed.length };
}

// Delete-then-recreate this importer's vendor rows for a game. The delete only
// happens once we HOLD replacement rows — a failed fetch must never wipe good
// data. `cardIdPrefix` exists because magic/yugioh get vendor rows from TWO
// importers (Scryfall/YGOPRODeck singles + TCGplayer sealed); scoping the
// delete to this importer's card-id namespace stops whichever import runs
// second from wiping the first one's rows.
export async function replaceVendorPrices(
  game: GameKey,
  rows: VendorRow[],
  opts?: { cardIdPrefix?: string }
): Promise<number> {
  if (rows.length === 0) {
    console.warn(`replaceVendorPrices[${game}]: 0 rows — keeping existing vendor prices.`);
    return 0;
  }
  await prisma.vendorPrice.deleteMany({
    where: { card: { game }, ...(opts?.cardIdPrefix ? { cardId: { startsWith: opts.cardIdPrefix } } : {}) },
  });
  let written = 0;
  for (let i = 0; i < rows.length; i += VENDOR_CHUNK) {
    try {
      const res = await prisma.vendorPrice.createMany({
        data: rows.slice(i, i + VENDOR_CHUNK),
        skipDuplicates: true, // (cardId, vendor, printing) is unique; dupes within a pull are expected
      });
      written += res.count;
    } catch (e) {
      // An FK violation (a vendor row whose card got dropped, e.g. by a slug
      // collision) fails its whole chunk — losing one chunk beats aborting the
      // game's entire import.
      console.warn(`replaceVendorPrices[${game}]: chunk at ${i} failed: ${(e as Error).message}`);
    }
  }
  return written;
}

// Daily snapshot of every priced card's headline price — powers trend charts.
// skipDuplicates makes re-runs on the same UTC day idempotent.
export async function snapshotPriceHistory(game: GameKey): Promise<number> {
  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let written = 0;
  let cursor: string | null = null;
  for (;;) {
    const cards: { id: string; marketPriceCents: number | null }[] = await prisma.card.findMany({
      where: { game, marketPriceCents: { not: null } },
      select: { id: true, marketPriceCents: true },
      orderBy: { id: "asc" },
      take: HISTORY_CHUNK,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (cards.length === 0) break;
    cursor = cards[cards.length - 1].id;
    const res = await prisma.priceHistory.createMany({
      data: cards.map((c) => ({ cardId: c.id, day, marketPriceCents: c.marketPriceCents as number })),
      skipDuplicates: true,
    });
    written += res.count;
    if (cards.length < HISTORY_CHUNK) break;
  }
  return written;
}
