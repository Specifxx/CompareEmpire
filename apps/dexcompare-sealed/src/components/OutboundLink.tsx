"use client";

import { track } from "@vercel/analytics";
import type { ReactNode } from "react";
import type { Placement } from "@/lib/affiliate";
import { buyEvents, goHref, type BuyItem } from "@/lib/click-events";
import type { Region } from "@/lib/regions";

// Every outbound buy link — to a store, TCGplayer or eBay — is one of these. A
// plain <a target="_blank">: no redirect hop and no JS navigation, so a click
// lands exactly where the href says and the affiliate networks see it untouched
// (the same design as Rift Compare's OutboundLink).
//
// It records Vercel Web Analytics events per click (lib/click-events.ts buyEvents, docs/analytics.md):
//   buy_click { retailer: "Pokebox (AU)" | "TCGplayer" | "eBay (ebay.com.au)", placement } and, when the link names its product,
//   buy_product { product, region }: two properties each, because Vercel's Pro plan keeps two per event (Hobby records none). With
//   NEXT_PUBLIC_ANALYTICS_PROPS=8 (Web Analytics Plus) it is one buy_click with eight.
// `track` queues a beacon-style request and returns at once: the browser follows the link without waiting for it.
//
// `go` (a store or TCGplayer OFFER: the product page's best price, table and buy bar, the pre-order lists): the href becomes our own
// /go?… redirect (src/app/go/route.ts), which counts the click on the server, where ad blockers can't hide it, and answers 302 to
// the same URL. eBay listings keep eBay's URL exactly as eBay returned it (no /go).
//
// Middle-click opens a tab without a `click` event, so it is caught through
// auxclick (button 1 only; right-click is button 2 and opens a menu, not the
// link). Each handler takes only its own button, so one click never fires both.
export function OutboundLink({
  href,
  rel,
  retailer,
  placement,
  className,
  title,
  children,
  "aria-label": ariaLabel,
  onFocus,
  item,
  go,
}: {
  href: string;
  rel: string;
  retailer: string;
  placement: Placement;
  className?: string;
  title?: string;
  children: ReactNode;
  "aria-label"?: string;
  onFocus?: (e: React.FocusEvent<HTMLAnchorElement>) => void;
  /** What the link is a click on, for the events (product slug, store key, price, rank). */
  item?: BuyItem;
  /** Route through /go: the region and the store key the destination must belong to. */
  go?: { region: Region; store: string };
}) {
  function record() {
    try {
      for (const [name, props] of buyEvents({ retailer, placement, rel, pathname: window.location.pathname, item })) track(name, props);
    } catch {
      /* analytics must never get in the way of the link */
    }
  }
  const to = go ? goHref({ dest: href, store: go.store, region: go.region, placement, product: item?.product, priceCents: item?.priceCents, position: item?.position }) : href;
  return (
    <a
      href={to}
      target="_blank"
      rel={rel}
      className={className}
      title={title}
      aria-label={ariaLabel}
      onFocus={onFocus}
      onClick={(e) => {
        if (e.button === 0) record();
      }}
      onAuxClick={(e) => {
        if (e.button === 1) record();
      }}
    >
      {children}
    </a>
  );
}
