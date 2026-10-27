"use client";

import { useEffect } from "react";
import { HILLTOPADS_ENABLED, HILLTOPADS_SRC } from "@/lib/ads";

// Loads the HilltopAds MultiTag zone — the primary ad network now that AdSense
// rejected the site. Injected once, site-wide, from the root layout so it runs on
// every page. HilltopAds' own snippet reads `document.currentScript.settings`, so
// we recreate it faithfully: build the <script>, set `.settings = {}`, async-load.
export function HilltopAdsLoader() {
  useEffect(() => {
    if (!HILLTOPADS_ENABLED) return;
    if (document.getElementById("hilltopads-zone")) return; // guard double-inject (strict mode / re-render)
    const s = document.createElement("script");
    s.id = "hilltopads-zone";
    (s as unknown as { settings: unknown }).settings = {};
    s.src = HILLTOPADS_SRC;
    s.async = true;
    s.referrerPolicy = "no-referrer-when-downgrade";
    document.body.appendChild(s);
  }, []);
  return null;
}
