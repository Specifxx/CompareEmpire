// What the eBay units (components/Ebay.tsx) say and where they go. Pure: no
// database, no React, so BrowseGrid uses it in the browser and the tests run it
// as it stands.
//
// The rules every unit follows live here and in the components, in one place:
//   • eBay is only ever an EPN-tagged SEARCH link (affiliate.ts ebaySearchUrl).
//     No price, count or "deal" from eBay is shown, because none is known.
//   • A unit never enters a ranked table, a count, a median, JSON-LD or a meta tag.
//   • Density: at most ONE unit in a phone viewport (390x844) and two on a
//     desktop one. The planners below keep units far enough apart; where a page
//     is too short to fit two, the footer banner is the one that gives way.

// ─── Search chips ──────────────────────────────────────────────────────────────

export interface EbayChip {
  id: string;
  label: string;
  /** Product words, with the set's name in front when there is one. Never empty. */
  query: string;
}

const TYPE_CHIPS = [
  { id: "box", label: "Booster boxes", query: "Booster Box" },
  { id: "etb", label: "ETBs", query: "Elite Trainer Box" },
  { id: "bundle", label: "Booster bundles", query: "Booster Bundle" },
  { id: "tin", label: "Tins", query: "Tin" },
  { id: "collection", label: "Collections", query: "Collection" },
  { id: "packs", label: "Packs", query: "Booster Pack" },
] as const;

/** The product-type key (sealed-title.ts TypeKey) that a chip is the same thing as, to leave out the one you are already on. */
const CHIP_OF_TYPE: Record<string, string> = {
  "booster-box": "box",
  etb: "etb",
  "pc-etb": "etb",
  "booster-bundle": "bundle",
  tin: "tin",
  collection: "collection",
  "booster-pack": "packs",
};

const withSet = (setName: string | null | undefined, query: string) => [setName?.trim(), query].filter(Boolean).join(" ");

/**
 * Banner chips: Booster boxes · ETBs · Booster bundles · Tins · Collections ·
 * Packs, each a search for that type (inside a set when `setName` is given).
 * `ownTypeKey` leaves out the type page you are on. Never more than 6.
 */
export function typeChips(setName?: string | null, ownTypeKey?: string | null): EbayChip[] {
  const own = ownTypeKey ? CHIP_OF_TYPE[ownTypeKey] : null;
  return TYPE_CHIPS.filter((c) => c.id !== own).map((c) => ({ id: c.id, label: c.label, query: withSet(setName, c.query) }));
}

export const QUICK_MAX = 5;

const QUICK = [
  { id: "box", label: "Booster box", query: "Booster Box" },
  { id: "etb", label: "ETB", query: "Elite Trainer Box" },
  { id: "bundle", label: "Booster bundle", query: "Booster Bundle" },
  { id: "case", label: "Case", query: "Booster Box Case" },
] as const;

const QUICK_OF_TYPE: Record<string, string> = {
  "booster-box": "box",
  etb: "etb",
  "pc-etb": "etb",
  "booster-bundle": "bundle",
  "booster-box-case": "case",
  "etb-case": "case",
  "booster-bundle-case": "case",
};

/**
 * "Also on eBay": the product's set crossed with {Booster box, ETB, Booster
 * bundle, Case}, leaving out the product's own type. Needs a set to be a
 * search worth offering, so no set → none. At most QUICK_MAX (there are four).
 */
export function quickSearches(setName: string | null | undefined, ownTypeKey?: string | null): EbayChip[] {
  if (!setName?.trim()) return [];
  const own = ownTypeKey ? QUICK_OF_TYPE[ownTypeKey] : null;
  return QUICK.filter((c) => c.id !== own)
    .slice(0, QUICK_MAX)
    .map((c) => ({ id: c.id, label: c.label, query: withSet(setName, c.query) }));
}

// ─── In-feed tiles ─────────────────────────────────────────────────────────────

export const FEED_EVERY = 12; // after the 12th, 24th, 36th real product
export const FEED_MAX = 3;
/** A tile needs this many real products after it, so it never ends a list or sits near the footer banner. */
export const FEED_MIN_TAIL = 8;

/**
 * Where in-feed tiles go in a grid of `total` real products: after the 12th,
 * 24th and 36th (never first, never in the first six, at most three), and only
 * where at least FEED_MIN_TAIL products follow. Returns the 1-based count of
 * real products BEFORE each tile. Pure and deterministic, so server and client
 * render the same markup.
 */
export function feedSlots(total: number): number[] {
  const out: number[] = [];
  for (let k = FEED_EVERY; out.length < FEED_MAX && total - k >= FEED_MIN_TAIL; k += FEED_EVERY) out.push(k);
  return out;
}

export type GridEntry<T> = { kind: "item"; item: T; index: number } | { kind: "feed"; slot: number };

/** The grid's items with a tile after each feedSlots position. */
export function withFeed<T>(items: readonly T[], enabled = true): GridEntry<T>[] {
  const slots = new Set(enabled ? feedSlots(items.length) : []);
  const out: GridEntry<T>[] = [];
  let slot = 0;
  items.forEach((item, index) => {
    out.push({ kind: "item", item, index });
    if (slots.has(index + 1)) out.push({ kind: "feed", slot: slot++ });
  });
  return out;
}

// ─── "Sold out here" links ─────────────────────────────────────────────────────

/**
 * A sold-out card's own link sits at least this many grid positions from every
 * other eBay unit in the grid: sixteen is eight phone rows or four desktop rows,
 * more than a screen on either, so two never share one.
 */
export const SOLDOUT_GAP = 16;
/** …past the first rows of a grid, which sit under the page's own banner… */
export const SOLDOUT_FIRST = 8;
/** …and with this many cards after it (four phone rows), so the footer banner is not right below. */
export const SOLDOUT_TAIL = 8;

/**
 * Which cards of a grid get their own "Sold out here — search eBay" link.
 * `entries` is the grid in order: a tile (feed) or a card with its sold-out flag.
 * A link needs a sold-out card, a spot at least SOLDOUT_GAP positions from every
 * tile and every earlier link, past the first SOLDOUT_FIRST, and with SOLDOUT_TAIL
 * cards after it. Returns the entry indexes. Pure.
 */
export function soldOutLinks(entries: readonly ({ feed: true } | { feed?: false; soldOut: boolean })[]): Set<number> {
  const feed = entries.flatMap((e, i) => (e.feed ? [i] : []));
  const out = new Set<number>();
  let last = -Infinity;
  entries.forEach((e, i) => {
    if (e.feed || !e.soldOut || i < SOLDOUT_FIRST || entries.length - 1 - i < SOLDOUT_TAIL) return;
    if (i - last < SOLDOUT_GAP || feed.some((f) => Math.abs(f - i) < SOLDOUT_GAP)) return;
    out.add(i);
    last = i;
  });
  return out;
}

/**
 * Which grid cells share a row with a sold-out link, at each column count the grid
 * uses (2 on a phone, 3 from md, 4 from lg): the cards under which a blank of the
 * link's height is kept (components/Ebay.tsx SoldOutSpacer), so the row's cards end
 * at the same line. Returns entry index -> breakpoint classes ("block md:hidden
 * lg:block"). `total` is the number of grid entries. Pure.
 */
export function soldOutMates(links: ReadonlySet<number>, total: number): Map<number, string> {
  const show = (i: number, cols: number) => [...links].some((l) => l !== i && Math.floor(l / cols) === Math.floor(i / cols));
  const out = new Map<number, string>();
  for (let i = 0; i < total; i++) {
    if (links.has(i)) continue;
    const [a, b, c] = [show(i, 2), show(i, 3), show(i, 4)];
    if (a || b || c) out.set(i, `${a ? "block" : "hidden"} ${b ? "md:block" : "md:hidden"} ${c ? "lg:block" : "lg:hidden"}`);
  }
  return out;
}

// ─── Page budgets ──────────────────────────────────────────────────────────────
// Where a page's own units leave too little room for the banner above the
// footer, the page asks for it to be dropped (components/Ebay.tsx NoPreFooter).
// Heights are phone-width estimates in px, checked by the screenshot sweep.

const PHONE_ROW = 330; // a product-card row on a phone: two cards and the gap
const DESK_ROW = 446; // …and on a desktop: four cards across
// Two units must be at least a viewport (844 phone, 900 desktop) apart, plus the
// slack that row heights vary by (a name that wraps, a per-pack line).
const GAP = 960;

/**
 * Product page: which of the lower units fit. The marketplace panel (or, sold
 * out, the callout) is always there; the offer table's closing group needs a
 * table long enough to sit a screen below it, and the footer banner needs that
 * much page (offer table, other regions, related products) under the last unit
 * above it. Estimated for a phone (offer row ~105px) and a desktop (~73px) and
 * both must fit: the sweep in README.md checks these numbers against real pages.
 */
export function productAdPlan(o: { offerRows: number; elsewhere: number; related: number }): { tableGroup: boolean; preFooter: boolean } {
  const phoneTo = 300 + 105 * o.offerRows;
  const deskTo = 160 + 73 * o.offerRows; // measured at 1280: the panel to the end of N rows is 160 + ~72 per row
  const tableGroup = phoneTo >= GAP && deskTo >= GAP;
  const phoneAfter = 80 + (o.elsewhere ? 130 + 44 * Math.ceil(o.elsewhere / 2) : 0) + (o.related ? 150 + PHONE_ROW * Math.ceil(o.related / 2) : 0);
  const deskAfter = 110 + (o.elsewhere ? 40 : 0) + (o.related ? 160 + DESK_ROW * Math.ceil(o.related / 4) : 0);
  // Above the footer banner: the group when there is one (it ends the table), else the panel.
  const preFooter = tableGroup ? phoneAfter >= GAP && deskAfter >= GAP : phoneTo + phoneAfter >= GAP && deskTo + deskAfter >= GAP;
  return { tableGroup, preFooter };
}

/** Set / type page: the banner is at the top, so the footer banner needs a grid long enough between them. */
export function gridPageHasRoomForFooter(products: number): boolean {
  return products >= 8;
}

/** Store directory or store page: rows are ~76px on a phone. */
export function listHasRoomForFooter(rows: number): boolean {
  return rows >= 14;
}

/**
 * Release calendar: which cards (0-based, in page order, both lists) carry their
 * own search link. Every sixth card, and none in the last six: the banner at the
 * bottom then has a screen of cards (a desktop card is ~150px) between it and the
 * nearest link. A short calendar (the usual three or four sets) has none, and the
 * banner is its one unit.
 */
export function releaseLinkIndexes(total: number): Set<number> {
  const out = new Set<number>();
  for (let i = 0; total - 1 - i >= 6; i += 6) out.add(i);
  return out;
}
