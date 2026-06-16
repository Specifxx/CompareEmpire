// Ad-network configuration.
//
// Google AdSense has been removed — the site now monetises via HilltopAds. These
// values are PUBLIC by design (they ship in the page HTML).

// ── HilltopAds (primary ad network) ────────────────────────────────────────────
// HilltopAds zone loader URLs, all loaded site-wide (see HilltopAdsLoader).
// HilltopAds does its own device/geo targeting and per-zone frequency capping, so
// every zone loads on every page and each fills only its eligible traffic (e.g. the
// mobile zone fills on phones). Protocol-relative so they inherit the page's https.
export const HILLTOPADS_ZONES: string[] = [
  // Banner / MultiTag (display + popup).
  "//deliciouslip.com/buXEVeszd.GTl/0LYxWkcS/_elmG9/ulZsUzlGksP/TYc/xCNMDQEb0aOsDCUbtPNhzLEY0/MbT/Qh4rORQ_",
  // Popunder.
  "//pleased-report.com/bP3.VK0TPw3bpXvUblm-VpJyZ/DB0X3mMgT/QoxwNOTGIe5KLgTAcXxTNTDGES1TMqz/ML",
  // Mobile.
  "//deliciouslip.com/b.XfVrsqdbG/l/0qYMWkcu/-esma9duaZHU/l-kGPPT/cBxhNpDbER1ZMCzgcntpNqzbET0DMNTgUu0kM/Qc",
];

// True when at least one zone is configured. Guards the loader.
export const HILLTOPADS_ENABLED = HILLTOPADS_ZONES.length > 0;
