"use client";

import { track } from "@vercel/analytics";
import { useEffect, useState } from "react";
import { AdSenseUnit } from "./AdSenseUnit";
import { GUIDE_AD_TEST_START, adsenseScriptSrc } from "@/lib/adsense";

// The guides-only display-ad test (DECISIONS.md "Display ads: a guides-only test", 2026-11-24). Half of visitors (a coin kept in
// their own localStorage) see ONE AdSense unit in a guide; the other half see nothing. Never on the server render (the guide is a
// CDN page, the same for everyone), never for an ad-free member (html[data-adfree]), never before GUIDE_AD_TEST_START, never without
// storage (no coin, no ad). Google's script is added by this component the first time an ad arm mounts, so no other page loads it.
//
// Measured with two Vercel events, once a visit each: gad_seen {arm} when a guide shows (either arm) and gad_buy {arm} on the first
// paid link clicked on a guide (rel sponsored, or our /go redirect). Keep the ads only if ad money per 1,000 guide views beats the
// buy clicks lost (buy clickers per arm × A$0.09 a buy click on Dex).

export const GAD_STORE = "dx_gad";
export type GadArm = "ad" | "none";

export function gadArmOf(v: string | null): GadArm | null {
  return v === "ad" || v === "none" ? v : null;
}

/** This visitor's arm, tossing the coin on first sight. Null: not in the test (before the start, no storage, a member). */
export function guideAdArm(now: number = Date.now()): GadArm | null {
  try {
    if (typeof window === "undefined" || now < GUIDE_AD_TEST_START) return null;
    if (document.documentElement.hasAttribute("data-adfree")) return null;
    let arm = gadArmOf(window.localStorage.getItem(GAD_STORE));
    if (!arm) {
      arm = window.crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? "ad" : "none";
      window.localStorage.setItem(GAD_STORE, arm);
      if (window.localStorage.getItem(GAD_STORE) !== arm) return null;
    }
    return arm;
  } catch {
    return null;
  }
}

function once(key: string, name: string, arm: GadArm) {
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    track(name, { arm });
  } catch {
    /* analytics must never get in the way */
  }
}

export function GuideAd({ client, slot }: { client: string; slot: string }) {
  const [arm, setArm] = useState<GadArm | null>(null);
  useEffect(() => {
    const a = guideAdArm();
    if (!a) return;
    setArm(a);
    once("dx_gad_seen", "gad_seen", a);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const paid = /\bsponsored\b/.test(link.rel) || new URL(link.href, location.href).pathname === "/go";
      if (paid) once("dx_gad_buy", "gad_buy", a);
    };
    document.addEventListener("click", onClick, true);
    if (a === "ad" && !document.querySelector('script[src*="googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
      const s = document.createElement("script");
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = adsenseScriptSrc(client);
      document.head.appendChild(s);
    }
    return () => document.removeEventListener("click", onClick, true);
  }, [client]);
  return arm === "ad" ? <AdSenseUnit client={client} slot={slot} placement="adsense-guide" /> : null;
}
