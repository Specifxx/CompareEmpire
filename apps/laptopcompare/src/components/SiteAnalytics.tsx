"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { isUncountedVisit } from "@/lib/analytics-filter";

// Vercel Web Analytics (mounted once, in the root layout). Pro bills every page view and custom event, so beforeSend drops the ones
// that are not a real visitor before they are sent (COST.md, 2026-10-23):
// - previews and local runs (localhost, 127.0.0.1, *.vercel.app): never the site's audience;
// - automated browsers (navigator.webdriver) and bot-looking user agents (headless Chrome, Lighthouse, crawlers that run JS);
// - the owner's own browsing: visit any page with ?notrack=1 once and this browser stops counting (?notrack=0 undoes it). The
//   flag is localStorage "va-disable" = "1", read on the visitor's own device only: no cookie, nothing the CDN sees.
// It also drops the query string from every page view: /au/sealed?q=… would otherwise send whatever a visitor typed into search.
// beforeSend has to be a client-side function, which is why this is its own component rather than the layout's.
const OPT_OUT_KEY = "va-disable";

function optedOut(): boolean {
  try {
    // The page that carries ?notrack=1 is not counted either, even before the effect below has stored the flag.
    if (new URLSearchParams(window.location.search).get("notrack") === "1") return true;
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (typeof window !== "undefined") {
    const nav = window.navigator;
    if (isUncountedVisit(window.location.hostname, nav.userAgent || "", nav.webdriver === true, optedOut())) return null;
  }
  try {
    const u = new URL(event.url);
    if (u.search) return { ...event, url: `${u.origin}${u.pathname}` };
  } catch {
    /* not a URL we can parse: send as-is */
  }
  return event;
}

export function SiteAnalytics() {
  // ?notrack=1 / ?notrack=0 sets or clears the opt-out on this browser.
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("notrack");
      if (v === "1") window.localStorage.setItem(OPT_OUT_KEY, "1");
      else if (v === "0") window.localStorage.removeItem(OPT_OUT_KEY);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, []);
  return <Analytics beforeSend={beforeSend} />;
}
