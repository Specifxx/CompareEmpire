// Google AdSense configuration. One AdSense ACCOUNT covers multiple sites, so
// the empire-wide publisher id is the code default — add tcgpriceempire.com as a
// site in the AdSense dashboard (Sites → Add site) and it serves. `||` (not `??`)
// so an env var accidentally set to an EMPTY string still falls back.
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-6842128782879909";

// True only when a syntactically valid publisher id is configured.
export const ADSENSE_ENABLED = /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);

// Manual ad-unit slot ids — OPTIONAL (Auto ads need none). Until a slot id is
// set, that placement renders nothing in production.
export const ADSENSE_SLOTS = {
  browse: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BROWSE ?? "",
  card: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CARD ?? "",
};

// Numeric publisher id used in /ads.txt, derived from the client id.
export function adsensePubId(): string {
  return ADSENSE_CLIENT.replace(/^ca-/, "");
}
