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
// Banner-only: the dedicated Popunder zone was removed because pop/popunder ads are
// an intrusive-interstitial guideline violation (Bing + Google) that suppresses
// rankings, and they bounce first-time visitors — the lost organic growth costs more
// than the low CPM earns. The clean TCGplayer/eBay affiliate banners cover the rest.
//
// NOTE: the remaining "MultiTag" zone can still serve a popup unless that format is
// turned OFF for this zone in the HilltopAds dashboard (now archived there) — it
// can't be controlled from code.
export const HILLTOPADS_ZONES: string[] = [
  // Banner / MultiTag (display only — popup disabled in the HilltopAds dashboard).
  "//deliciouslip.com/buXEVeszd.GTl/0LYxWkcS/_elmG9/ulZsUzlGksP/TYc/xCNMDQEb0aOsDCUbtPNhzLEY0/MbT/Qh4rORQ_",
  // Mobile banner.
  "//deliciouslip.com/b.XfVrsqdbG/l/0qYMWkcu/-esma9duaZHU/l-kGPPT/cBxhNpDbER1ZMCzgcntpNqzbET0DMNTgUu0kM/Qc",
];

// True when at least one zone is configured. Guards the loader.
export const HILLTOPADS_ENABLED = HILLTOPADS_ZONES.length > 0;
