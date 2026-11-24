// Store partner codes (2026-11-24; ported from OP Compare's lib/store-partner-deals.ts, owner's ask 2026-11-24).
//
// A store we earn from can give us an EXCLUSIVE discount code for DexCompare visitors. It is shown as a chip on
// that store's rows ("5% off · code COMPEMP5"). Because the store issued it to us and linked it to our affiliate
// account, an order with the code is credited to us even when the referral parameter is lost on a phone or an app
// handoff (about a fifth of affiliate orders arrive that way).
//
// THE HARD RULE: a code never changes a store's place, its price or the "Best price" badge. It is a label beside
// the price, never a discount applied to it (a code can have exclusions and minimums we cannot see). Nothing in a
// sort or a ranking reads this file (tests/store-codes.test.ts).
//
// A code shows only while someone confirmed it in the last CODE_RECHECK_DAYS days (`checked`), and never on or
// after `until`: a code nobody re-checked quietly disappears rather than going stale.
//
// Pure data, no imports: client components (the price rows) read it.

export interface StoreCode {
  /** Bare hostname of the store, no www. */
  host: string;
  name: string;
  /** Exactly as typed at checkout. */
  code: string;
  /** What it gives, short: "5% off". */
  offer: string;
  /** ISO date the store issued or someone last confirmed the code. */
  checked: string;
  /** ISO date the code ends (exclusive), if the store set one. */
  until?: string;
}

export const STORE_CODES: StoreCode[] = [
  // Cardboard Hero (CA): our GoAffPro affiliate store (ref apthvqnu, lib/awin.ts). Anthony issued COMPEMP5 by email on
  // 2026-11-24, linked to our affiliate account: 5% off the order, items already on sale excluded. Re-check by 2026-12-24.
  { host: "cardboardhero.com", name: "Cardboard Hero", code: "COMPEMP5", offer: "5% off", checked: "2026-11-24" },
];

export const CODE_RECHECK_DAYS = 30;
const DAY = 86_400_000;

function bareHost(hostOrUrl: string | null | undefined): string | null {
  if (!hostOrUrl) return null;
  let h = hostOrUrl.trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(h)) h = new URL(h).hostname;
  } catch {
    return null;
  }
  return h.replace(/^www\./, "").split("/")[0] || null;
}

/** The live code for a store (its host or any URL of it), or null. */
export function activeStoreCode(
  hostOrUrl: string | null | undefined,
  now: Date = new Date(),
  codes: readonly StoreCode[] = STORE_CODES,
): StoreCode | null {
  const h = bareHost(hostOrUrl);
  if (!h) return null;
  const c = codes.find((x) => x.host === h);
  if (!c) return null;
  const checked = Date.parse(c.checked);
  if (!Number.isFinite(checked) || now.getTime() - checked > CODE_RECHECK_DAYS * DAY) return null;
  if (c.until && now.getTime() >= Date.parse(c.until)) return null;
  return c;
}
