// Ad-network configuration.
//
// Google AdSense has been removed — the site now monetises via HilltopAds, whose
// MultiTag zone is loaded site-wide (see HilltopAdsLoader). All values here are
// PUBLIC by design (they appear in the page HTML) and are driven by environment
// variables so monetization can be switched on/off WITHOUT a code change.

// ── HilltopAds ─────────────────────────────────────────────────────────────────
// MultiTag zone loader URL. Set "" (env or here) to disable all ad code.
export const HILLTOPADS_SRC = process.env.NEXT_PUBLIC_HILLTOPADS_SRC || "";

// True only when a loader URL is configured. Guards the site-wide loader so we
// never inject an empty/broken <script>.
export const HILLTOPADS_ENABLED = HILLTOPADS_SRC.length > 0;
