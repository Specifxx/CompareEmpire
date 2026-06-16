// Ad-network configuration.
//
// Google AdSense has been removed — the site now monetises via HilltopAds, whose
// MultiTag zone is loaded site-wide (see HilltopAdsLoader). All values here are
// PUBLIC by design (they appear in the page HTML) and are driven by environment
// variables so monetization can be switched on/off WITHOUT a code change.

// ── HilltopAds (primary ad network) ────────────────────────────────────────────
// MultiTag "zone" loader URL — PUBLIC by design (it ships in the page HTML). The
// live zone is the code default so ads work with no env config; override per-deploy
// with NEXT_PUBLIC_HILLTOPADS_SRC, or set it to "" to turn HilltopAds off.
// Protocol-relative so it inherits the page's https.
export const HILLTOPADS_SRC =
  process.env.NEXT_PUBLIC_HILLTOPADS_SRC ||
  "//deliciouslip.com/buXEVeszd.GTl/0LYxWkcS/_elmG9/ulZsUzlGksP/TYc/xCNMDQEb0aOsDCUbtPNhzLEY0/MbT/Qh4rORQ_";

// Guards the loader so an empty/"" zone ships no script at all.
export const HILLTOPADS_ENABLED = HILLTOPADS_SRC.length > 0;
