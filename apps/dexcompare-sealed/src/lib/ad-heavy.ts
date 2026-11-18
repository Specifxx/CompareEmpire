// The ad-intensity test (owner, 2026-11-19: "Dex Compare and Yu-Gi-Oh! Compare go super heavy on ads, much heavier than ever done
// before. But people can still use the site once they close all the ads"; Rift and MTG Compare stay light, as the control).
// DexCompare is a HEAVY site: on top of the light set (the banner pair below the content, the phone dock, the pinned rows) it shows
//   • the banner pair again at the TOP of every region page (`heavy-top-*`);
//   • a "Recommended for you" pop-up of TCGplayer products that covers the page until it is closed (`heavy-popup`): never on the
//     page a visitor lands on (Google judges the landing page), on the 2nd, 5th and 8th page of a visit, at most three a visit;
//   • a "Recommended" card that slides in at the bottom corner after a while on a page (`heavy-slidein`), closable, at most four a visit.
// Pop-ups and slide-ins are TCGplayer ONLY (owner, 2026-11-19: no eBay in pop-ups until eBay Partner Network approves the format).
// Everything is labelled "Ad", closes with ✕, Esc or the backdrop, and never shows to ad-free members or in the app.
// Roll back by setting AD_HEAVY to false. Read 10 Dec against Rift and MTG Compare (DECISIONS.md, 2026-11-19).
export const AD_HEAVY = true;

const VIEWS_KEY = "heavy-views";
const POPUPS_KEY = "heavy-popups";
const SLIDES_KEY = "heavy-slides";

/** The page views of a visit on which the pop-up opens: never the landing page. Pure, for the tests. */
export const POPUP_AT = [2, 5, 8] as const;
export const MAX_SLIDES = 4;
/** Seconds on a page before the slide-in card appears. */
export const SLIDE_AFTER_S = 12;

export function popupDue(view: number, shown: number): boolean {
  return (POPUP_AT as readonly number[]).includes(view) && shown < POPUP_AT.length;
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
export const slidesShown = () => readN(SLIDES_KEY);
export const noteSlide = () => writeN(SLIDES_KEY, readN(SLIDES_KEY) + 1);

/** Ad-free members and the app never see the heavy set. */
export function heavyBlocked(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.matches("[data-adfree], .capacitor-native");
}
