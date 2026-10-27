"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from "@/lib/ads";

// Loads the AdSense script AFTER first interaction (or a short idle delay)
// instead of in <head>. adsbygoogle.js is the heaviest third-party on the site
// and was sitting on the mobile critical path; deferring it doesn't cost
// revenue (ads load within seconds, before any realistic click) and the
// `google-adsense-account` meta stays in the initial HTML for verification.
// AdSlot components keep pushing into window.adsbygoogle — the queue is
// drained when the script arrives, so placement order is unaffected.
export function AdSenseLoader() {
  useEffect(() => {
    if (!ADSENSE_ENABLED) return;
    let loaded = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      const s = document.createElement("script");
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.async = true;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "scroll", "keydown", "touchstart"];
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, load));
      if (timer) clearTimeout(timer);
    };
    events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    // Idle fallback so ads still appear for visitors who just read.
    timer = setTimeout(load, 3500);
    return cleanup;
  }, []);
  return null;
}
