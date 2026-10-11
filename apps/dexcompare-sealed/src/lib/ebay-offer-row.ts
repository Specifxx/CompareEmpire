// The eBay row of a product's price table (components/OfferTable.tsx, EbayStrip.tsx OfferRowsWithEbay): which listing it shows, where it
// sits among the store rows, and the note under the table. Pure, shared by the server table and the browser.
//
// The owner's call (2026-10-11): DexCompare compares WEBSITES, and eBay is one of them, so the product's cheapest eBay listing is a row of
// the store table, ranked by its price among the stores you can buy from now, tinted and with eBay's blue button, labelled "Ad". It is
// never the "Best price", never counted in "Prices at N stores", the median or the per-pack price, and never in JSON-LD, meta or the
// sitemap. eBay's API License Agreement asks that eBay content not be "co-mingled or combined with non-eBay Content" (8.1(b)(2)): the
// owner chose this knowing that (DEPLOY.md, "eBay's rules, and how each is met").

export interface PriceFloor {
  /** In major units ("12.40"), the eBay listing's own currency. */
  value: number;
  currency: string;
}

/** A listing's price in cents, or null when it is not a positive number. */
export function listingCents(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

// "36 Packs", "18-Pack", "9 Booster Packs", "2 x Booster Packs", "36pk", "6 Boosters", "18er Display": a pack count the title states.
// Not a bare "N Booster" ("151 Booster Bundle" names the set 151), and never 151 itself ("Pokemon 151 Booster Packs" is that set's).
const STATED_PACKS = /\b(\d{1,3})\s*(?:-\s*)?(?:x\s*)?(?:booster\s*)?(?:packs?|pk|packungen|boosters)\b|\b(\d{1,3})er\b/gi;

/** The pack counts a listing's title states ("Booster Box 18 Packs" → [18]); empty when it states none. */
export function statedPacks(title: string): number[] {
  return [...title.matchAll(STATED_PACKS)].map((m) => Number(m[1] ?? m[2])).filter((n) => n > 0 && n !== 151);
}

/**
 * A listing that states a pack count, none of them the product's (lib/packs.ts): another product. "Surging Sparks Booster Box 18 Packs"
 * is an 18-pack display, not the 36-pack box, and lowest price first would rank it above every store. No pack count known, or none
 * stated: no opinion.
 */
export function wrongPackCount(title: string, packs: number | null | undefined): boolean {
  if (!packs) return false;
  const stated = statedPacks(title);
  return stated.length > 0 && !stated.includes(packs);
}

/**
 * The listing the table shows for eBay: the lowest-priced of the product's OWN feed (never its type's or generic listings), skipping one
 * under `floor` (40% of the cheapest store price, when the stores price in the eBay site's currency: that cheap, it is a part of the
 * product or a single card, not the product) and one whose title states another pack count than the product's `packs`. Ties keep the
 * feed's order (lowest price first, as stored).
 */
export function pickListing<T extends { title?: string; price: { value: string; currency: string } }>(items: readonly T[], floor: PriceFloor | null, packs: number | null = null): T | null {
  let pick: T | null = null;
  let low = Infinity;
  for (const it of items) {
    const n = Number(it.price.value);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (floor && it.price.currency === floor.currency && n < floor.value) continue;
    if (wrongPackCount(it.title ?? "", packs)) continue;
    if (n < low) {
      pick = it;
      low = n;
    }
  }
  return pick;
}

/**
 * Where the eBay row goes among the store rows, which come ranked (rankOffers: open first, cheapest first; then not checked recently,
 * then sold out): before the first open row dearer than the listing (a tie stays with the store), else straight after the last open row
 * (the top, when none is open: an eBay listing is one you can buy). `cents` null (no listing yet, or one in another currency than the
 * stores': NZ and SG are served the AU and US sites) is never compared: the row goes after the open rows.
 */
export function ebayRowIndex(rows: readonly { open: boolean; cents: number }[], cents: number | null): number {
  let lastOpen = -1;
  rows.forEach((r, i) => {
    if (r.open) lastOpen = i;
  });
  if (cents != null) {
    const i = rows.findIndex((r, j) => j <= lastOpen && r.open && r.cents > cents);
    if (i >= 0) return i;
  }
  return lastOpen + 1;
}

/** NZ and SG are served the AU and US sites' listings: whose they are, and that delivery is not shown. */
export const SHARED_SITE_NOTE: Readonly<Record<string, string>> = {
  nz: " It is an eBay Australia listing (the eBay New Zealand buyers use); delivery to New Zealand is not shown.",
  sg: " It is an eBay US listing (the eBay Singapore buyers use); delivery to Singapore is not shown.",
};

/** The sentence under the table about its eBay row: static (server-rendered), so it reads the same whichever state the row is in. */
export function ebayRowNote(region: string): string {
  return (
    " The tinted eBay row is an ad: the lowest-priced eBay listing we have for this product (as imported from eBay, before shipping; how long ago is on the row), or an eBay search when there is none." +
    " Its link is an eBay Partner Network affiliate link: we may earn a commission, at no extra cost to you." +
    (SHARED_SITE_NOTE[region] ?? "")
  );
}
