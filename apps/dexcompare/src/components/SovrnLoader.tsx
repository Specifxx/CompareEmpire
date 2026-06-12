"use client";

import { useEffect } from "react";
import { SOVRN_API_KEY } from "@/lib/affiliate";

// Loads Sovrn Commerce's vglnk.js AFTER first interaction (or a short idle
// delay) — same deferral pattern as AdSenseLoader, keeping third-party JS off
// the mobile critical path. The script auto-affiliates outbound merchant links
// at click time (Sovrn's install detection also needs it on the page).
//
// Links we already monetise DIRECTLY (eBay EPN, TCGplayer Impact, Amazon, and
// Sovrn server-side redirects from affiliateUrl) carry rel="norewrite", which
// vglnk.js honours — so the script can never hijack a full-rate direct link.
export function SovrnLoader() {
  useEffect(() => {
    let loaded = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      (window as unknown as { vglnk: { key: string } }).vglnk = { key: SOVRN_API_KEY };
      const s = document.createElement("script");
      s.src = "https://cdn.viglink.com/api/vglnk.js";
      s.async = true;
      document.body.appendChild(s);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "scroll", "keydown", "touchstart"];
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, load));
      if (timer) clearTimeout(timer);
    };
    events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    timer = setTimeout(load, 3500);
    return cleanup;
  }, []);
  return null;
}
