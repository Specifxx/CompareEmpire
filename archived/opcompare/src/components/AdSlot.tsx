// A single ad placement.
//
// Google AdSense has been removed — the site now monetises via HilltopAds, whose
// MultiTag zone is loaded site-wide from the root layout (see HilltopAdsLoader).
// HilltopAds serves at the page level (popunder/banner), not as a per-slot fill, so
// these in-content placements render nothing for now. The component is kept as the
// placement anchor so a HilltopAds banner zone can drop in here later without
// editing every page; its props are accepted and ignored.
export function AdSlot(_props: {
  slot?: string;
  label?: string;
  height?: number;
  format?: string;
  responsive?: boolean;
  className?: string;
}) {
  return null;
}
