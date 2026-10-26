"use client";

import { track } from "@vercel/analytics";
import type { ReactNode } from "react";
import { AMAZON_AU_RETAILER, AMAZON_REL, type AmazonPlacement } from "@/lib/amazon";
import { amazonClickEvent, amazonGa4Params, buyEvents } from "@/lib/click-events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * An Amazon AU link (lib/amazon.ts): a plain <a target="_blank" rel="sponsored nofollow noopener"> straight to amazon.com.au with the
 * owner's tag, built on the server (the href arrives as it will be followed: no redirect, no /go). A click (left, or middle through
 * auxclick, like OutboundLink) records:
 *   • buy_click { retailer: "Amazon AU", placement } (Vercel), so Amazon sits beside the stores in the same report;
 *   • amazon_click { product, region } on Vercel's Pro plan ({ product, region, page } with Web Analytics Plus);
 *   • amazon_click { product, region, page } in GA4, when GA4 is loaded (lib/ga4.ts).
 * `product` is the product's slug, or what the link searches for ("set:phantasmal-flames", "type:elite-trainer-boxes", "guide:…").
 */
export function AmazonLink({ href, product, placement, className, children }: { href: string; product: string; placement: AmazonPlacement; className?: string; children: ReactNode }) {
  function record() {
    try {
      const pathname = window.location.pathname;
      for (const [name, props] of buyEvents({ retailer: AMAZON_AU_RETAILER, placement, rel: AMAZON_REL, pathname, item: { product, store: "amazon-au" } })) track(name, props);
      const [name, props] = amazonClickEvent({ product, pathname });
      track(name, props);
      window.gtag?.("event", "amazon_click", amazonGa4Params({ product, pathname }));
    } catch {
      /* analytics must never get in the way of the link */
    }
  }
  return (
    <a
      href={href}
      target="_blank"
      rel={AMAZON_REL}
      className={className}
      data-amazon={placement}
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
