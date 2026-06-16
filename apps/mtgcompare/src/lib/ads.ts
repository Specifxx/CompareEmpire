// Google AdSense configuration.
//
// All values here are PUBLIC by design (they appear in the page HTML) and are
// driven by environment variables so monetization can be switched on WITHOUT a
// code change — just set the publisher id and redeploy.
//
// Quick start (only one var is required):
//   NEXT_PUBLIC_ADSENSE_CLIENT="ca-pub-1234567890123456"
// Leaving it empty disables ALL ad code: no loader script, no /ads.txt, and the
// AdSlot component renders a harmless styled placeholder instead of an ad unit.

// AdSense publisher id. One AdSense ACCOUNT covers multiple sites, so the same
// publisher id used on RiftCompare is the code default here — add dexcompare.app
// as a site in that AdSense account (Sites → Add site) and it serves. NOTE: `||`
// (not `??`) so an env var accidentally set to an EMPTY string still falls back
// to this id — an empty value was silently disabling the loader/meta tag.
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-6842128782879909";

// True only when a syntactically valid publisher id is configured. Guards every
// place that emits real ad markup so we never ship a broken/empty <ins>.
export const ADSENSE_ENABLED = /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);

// Manual ad-unit slot ids (AdSense → Ads → By ad unit → Display ad → "data-ad-slot").
// OPTIONAL. Until a slot id is set, that placement shows the styled placeholder.
// (Auto ads need no slot ids at all — just turn them on in the AdSense dashboard.)
export const ADSENSE_SLOTS = {
  // In-article unit, rendered inside guides.
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE ?? "",
  // Leaderboard unit at the top of the browse grid.
  browse: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BROWSE ?? "",
  // In-content unit on the card detail / price-comparison page (highest traffic).
  card: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CARD ?? "",
};

// Numeric publisher id ("pub-XXXXXXXXXXXXXXXX") used in /ads.txt, derived from the
// client id so there is only ever one source of truth.
export function adsensePubId(): string {
  return ADSENSE_CLIENT.replace(/^ca-/, "");
}

// ── HilltopAds (primary ad network) ────────────────────────────────────────────
// HilltopAds replaces Google AdSense as the primary ad source (AdSense rejected
// the site). This is the MultiTag "zone" loader URL — PUBLIC by design (it ships
// in the page HTML). The live zone is the code default so ads work with no env
// config; override per-deploy with NEXT_PUBLIC_HILLTOPADS_SRC, or set it to "" to
// turn HilltopAds off. Protocol-relative so it inherits the page's https.
export const HILLTOPADS_SRC =
  process.env.NEXT_PUBLIC_HILLTOPADS_SRC ||
  "//deliciouslip.com/bSXMVss.d/GklI0wYsWNcm/LeQme9-uSZXUvlDkZP/TYcYxHNqDNEyziOqTLcCt_NEz/Eg0TM/TyQTwSMoQ-";

// Guards the loader so an empty/"" zone ships no script at all.
export const HILLTOPADS_ENABLED = HILLTOPADS_SRC.length > 0;
