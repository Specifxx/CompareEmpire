"use client";

import Script from "next/script";
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from "@/lib/ads";

// Loads the Google AdSense script when a publisher id is configured. Rendering
// nothing otherwise keeps local dev and unconfigured deploys completely ad-free.
export function WebAdsLoader() {
  if (!ADSENSE_ENABLED) return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
