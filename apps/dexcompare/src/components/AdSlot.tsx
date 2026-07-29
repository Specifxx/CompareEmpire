// A single ad placement.
//
// Google AdSense and HilltopAds have both been removed — monetisation is now the
// first-party TCGplayer + eBay affiliate banners (FooterAds, EbayAd, TcgplayerAd),
// placed contextually rather than via generic ad-network slots. This component is
// kept as a placement anchor in case a per-slot network is added later; its props
// are accepted and ignored, and it renders nothing.
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
