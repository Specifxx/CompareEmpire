// The product page's "how many store rows" test (2026-11-16, starts 20 Nov, DECISIONS.md "Rows test"). Pure: dates, eligibility, keys, the arms.
//
// THE QUESTION (owner, 2026-11-16): does listing every store dilute the clicks that pay? Since 2026-10-24 the table shows ALL rows
// (VISIBLE_ROWS 1000). Dex sends ~70% of buy clicks to stores with no programme, so a long list may bury eBay, TCGplayer and Amazon.
//
//   a (control, as today): every store row is drawn.
//   b: the pinned rows (eBay, Amazon, TCGplayer) and the cheapest RT_STORES_SHOWN stores are drawn; the rest sit behind the table's
//      own "Show N more stores" row, one tap away. The cheapest price, the order and every row's wording are unchanged.
//
// WHERE: the product page's price table only, never the quick view (its own A/B tests run 20 Nov to 3 Dec and must not be touched).
// The server HTML is the control for everyone (a crawler and a visitor without script see every row); arm b collapses after the
// page runs, so no cloaking and no second URL. Only pages with enough stores for the cap to matter are in the test: others are in
// neither arm, so every visit counted could have seen a difference.
//
// RECORDED (Vercel Web Analytics, one property `k` = "<region>:<arm>", once a visit): rt_seen (an eligible table showed), rt_paid
// (a click on eBay, TCGplayer, Amazon or an affiliate store), rt_store (a click on a store row), rt_more (the "Show more" row opened).
// Primary: rt_paid over rt_seen. Guardrail: rt_paid + rt_store over rt_seen must not fall (a store click can pay too).

export const RT_START = Date.parse("2026-11-20T00:00:00Z");
export const RT_END = Date.parse("2026-12-18T00:00:00Z");
export const RT_STORE = "rt1";
export const RT_SEEN = "rt1_seen";
export const RT_STORES_SHOWN = 5;
/** Eligible only when the cap hides at least this many stores (a "Show 1 more" row is not a test). */
export const RT_MIN_HIDDEN = 4;

export type RtArm = "a" | "b";
export const rtActive = (now: number): boolean => now >= RT_START && now < RT_END;
export const rtEligible = (storeRows: number): boolean => storeRows >= RT_STORES_SHOWN + RT_MIN_HIDDEN;
export const rtArm = (byte: number): RtArm => (byte & 1 ? "b" : "a");
export const parseRtArm = (raw: string | null): RtArm | null => (raw === "a" || raw === "b" ? raw : null);
export const rtKey = (region: string, arm: RtArm): string => `${region}:${arm}`;
export const RT_EVENTS = ["rt_seen", "rt_paid", "rt_store", "rt_more"] as const;
/** The rows drawn before the "more" groups: the pinned ones plus the cheapest stores. Arm a: all of them. */
export const rtVisible = (arm: RtArm | null, pinned: number, total: number): number => (arm === "b" ? pinned + RT_STORES_SHOWN : total);
