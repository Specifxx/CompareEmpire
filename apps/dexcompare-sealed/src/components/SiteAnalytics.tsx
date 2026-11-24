"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { readCampaign } from "@/lib/campaign";

// Vercel Web Analytics, with the query string dropped from every page view:
// /au/sealed?q=… would otherwise send whatever a visitor typed into search.
// The path is enough to count the page. beforeSend has to be a client-side
// function, which is why this is its own component rather than the layout's.
function stripQuery(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const u = new URL(event.url);
    if (!u.search) return event;
    // Keep only the utm_* tags (an ad's campaign is how Vercel counts its visitors; 2026-11-14).
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) if (/^utm_(source|medium|campaign)$/.test(k)) keep.set(k, v);
    const q = keep.toString();
    return { ...event, url: `${u.origin}${u.pathname}${q ? `?${q}` : ""}` };
  } catch {
    /* not a URL we can parse: send as-is */
  }
  return event;
}

export function SiteAnalytics() {
  // First touch of the tab: the landing URL's utm_campaign, kept for the buy click (lib/campaign.ts).
  useEffect(() => {
    readCampaign();
  }, []);
  // Reliable images (owner, 2026-11-23 UX review, P1 15: two guide thumbnails were blank on first load). Every <img> reserves its
  // size already; one that fails is tried once more (a share card drawn on first request can time out), then shows the site's
  // mark on its plate instead of a broken picture.
  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallback === "1") return;
      if (img.dataset.retried !== "1") {
        img.dataset.retried = "1";
        const src = img.currentSrc || img.src;
        window.setTimeout(() => {
          img.removeAttribute("srcset");
          img.src = src + (src.includes("?") ? "&" : "?") + "r=1";
        }, 1500);
        return;
      }
      img.dataset.fallback = "1";
      img.removeAttribute("srcset");
      img.src = "/icon.svg";
      img.style.objectFit = "contain";
      img.style.padding = "18%";
      img.style.opacity = "0.35";
    };
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);
  return <Analytics beforeSend={stripQuery} />;
}
