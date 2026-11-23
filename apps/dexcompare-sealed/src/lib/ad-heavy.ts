// The ad-intensity test (owner, 2026-11-19: "Dex Compare and Yu-Gi-Oh! Compare go super heavy on ads, much heavier than ever done
// before. But people can still use the site once they close all the ads"; Rift and MTG Compare stay light, as the control).
// DexCompare is a HEAVY site: on top of the light set (the banner pair below the content, the phone dock, the pinned rows) it shows
//   • the banner pair again at the TOP of every region page (`heavy-top-*`);
//   • a "Recommended for you" pop-up of TCGplayer products that covers the page until it is closed (`heavy-popup`): never on the
//     page a visitor lands on (Google judges the landing page), on the 2nd, 5th and 8th page of a visit, at most three a visit;
//   • (until 2026-11-23) a "Recommended" card that slid in at the bottom corner (`heavy-slidein`): removed, it covered content.
// Pop-ups and slide-ins are TCGplayer ONLY (owner, 2026-11-19: no eBay in pop-ups until eBay Partner Network approves the format).
// Everything is labelled "Ad", closes with ✕, Esc or the backdrop, and never shows to ad-free members or in the app.
// Roll back by setting AD_HEAVY to false. Read 10 Dec against Rift and MTG Compare (DECISIONS.md, 2026-11-19).
export const AD_HEAVY = true;

const VIEWS_KEY = "heavy-views";
const POPUPS_KEY = "heavy-popups";

/** AMENDED 2026-11-23 (owner's UX review, P0 1: ads never fire during typing or cover content, at most once a session).
 *  The pop-up opens at most ONCE a visit, from the 2nd page on, never while the visitor types (lib/visitor-busy.ts), and only when the
 *  visit's one prompt slot is free (lib/prompt-slot.ts). The slide-in card is gone: a floating card covered product tiles. The
 *  10 Dec read uses desktop data up to this change's deploy time for the old cadence (ops/product-ux/log.md). Pure, for the tests. */
export const POPUP_FROM_VIEW = 2;
export const MAX_POPUPS = 1;

export function popupDue(view: number, shown: number): boolean {
  return view >= POPUP_FROM_VIEW && shown < MAX_POPUPS;
}

function readN(key: string): number {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
function writeN(key: string, n: number): void {
  try {
    sessionStorage.setItem(key, String(n));
  } catch {
    /* storage refused: the counters reset */
  }
}

/** Counts this page view and returns its number in the visit (1 = the landing page). Storage that fails counts every page as 1. */
export function countView(): number {
  const n = readN(VIEWS_KEY) + 1;
  writeN(VIEWS_KEY, n);
  return n;
}
export const popupsShown = () => readN(POPUPS_KEY);
export const notePopup = () => writeN(POPUPS_KEY, readN(POPUPS_KEY) + 1);

/** Phones are out of the heavy set since 2026-11-22 (owner's tap on the decision card, page budget rules 2, 3 and 6): below 768px a
 *  visitor gets the light set only (no top banner pair, no pop-up, no slide-in). Desktop keeps the heavy set until the 10 Dec read;
 *  phone data is read only up to the cut (ops/product-ux/log.md has the deploy time). The top pair hides with CSS (`hidden md:block`). */
export const HEAVY_MIN_WIDTH = 768;
export function heavyPhone(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia(`(min-width: ${HEAVY_MIN_WIDTH}px)`).matches;
}

/** Phones are out of the heavy set since 2026-11-22 (owner's tap on the decision card, page budget rules 2, 3 and 6): below 768px a
 *  visitor gets the light set only (no top banner pair, no pop-up, no slide-in). Desktop keeps the heavy set until the 10 Dec read;
 *  phone data is read only up to the cut (ops/product-ux/log.md has the deploy time). The top pair hides with CSS (`hidden md:block`). */
export const HEAVY_MIN_WIDTH = 768;
export function heavyPhone(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia(`(min-width: ${HEAVY_MIN_WIDTH}px)`).matches;
}

/** Ad-free members and the app never see the heavy set. */
export function heavyBlocked(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.matches("[data-adfree], .capacitor-native");
}
