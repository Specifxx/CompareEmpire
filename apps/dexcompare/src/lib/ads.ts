// Ad-network configuration.
//
// Google AdSense has been removed — the site now monetises via HilltopAds (loaded
// site-wide; see HilltopAdsLoader). These values are PUBLIC by design (they ship in
// the page HTML).

// ── HilltopAds (primary ad network) ────────────────────────────────────────────
// HilltopAds zone loader URLs, all loaded site-wide (see HilltopAdsLoader).
// HilltopAds does its own device/geo targeting and per-zone frequency capping, so
// every zone loads on every page and each fills only its eligible traffic (e.g. the
// mobile zone fills on phones). Protocol-relative so they inherit the page's https.
//
// The "Banner / MultiTag" zone was REMOVED (not just archived in the dashboard):
// MultiTag is a mixed-format tag that can serve a popup/popunder regardless of a
// dashboard toggle, and users kept seeing pop-ups despite the zone being archived
// on the HilltopAds side — that setting isn't reliably enforceable from here, so
// the only guaranteed fix is to stop the site from loading that zone's script at
// all. Only the plain mobile banner zone remains; the clean TCGplayer/eBay
// affiliate banners cover the rest of monetisation.
export const HILLTOPADS_ZONES: string[] = [
  // Mobile banner (plain display banner — no MultiTag / popup risk).
  "//deliciouslip.com/b.XfVrsqdbG/l/0qYMWkcu/-esma9duaZHU/l-kGPPT/cBxhNpDbER1ZMCzgcntpNqzbET0DMNTgUu0kM/Qc",
];

// True when at least one zone is configured. Guards the loader.
export const HILLTOPADS_ENABLED = HILLTOPADS_ZONES.length > 0;
