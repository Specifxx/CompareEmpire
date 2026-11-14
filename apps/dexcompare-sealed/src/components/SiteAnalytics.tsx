"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

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
  return <Analytics beforeSend={stripQuery} />;
}
