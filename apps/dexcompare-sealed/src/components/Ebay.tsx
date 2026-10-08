import type { ReactNode } from "react";
import { ebayRetailer, ebaySearchUrl, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import type { Region } from "@/lib/regions";
import { OutboundLink } from "./OutboundLink";

// The small pieces of the eBay units that are not the listing strips (EbayStrip.tsx):
//   • the "Ad" label, used wherever an eBay link sits inside another component;
//   • <NoPreFooter/>: a page too short to hold its own units beside the strip above the footer asks for it to go;
//   • EbaySearchLink: a plain <a> to an EPN-tagged eBay SEARCH (affiliate.ts ebaySearchUrl), through OutboundLink,
//     for the header's "eBay" item and the product page's functional marketplace rows.
//
// What they all do, and never do:
//   • rel is "sponsored nofollow noopener noreferrer"; one buy_click {retailer, placement} per click; no redirect hop;
//   • each is visibly an ad ("Ad" pill, or the affiliate note beside the group it belongs to);
//   • none is part of a ranking, a count, a median, JSON-LD, meta or the sitemap;
//   • no script, no iframe, no overlay, no countdown. Every unit's root carries data-ad="<placement>" for the sweep.

/** The small "Ad" label. */
export function AdPill({ className = "" }: { className?: string }) {
  return <span className={`ad-pill ${className}`}>Ad</span>;
}

/**
 * Put on a page whose own units leave no room for the strip above the footer
 * (src/lib/ebay-ads.ts). globals.css hides [data-ebay-prefooter] when it is present.
 */
export function NoPreFooter() {
  return <span hidden data-ebay-no-prefooter="" />;
}

/** An eBay search link: the tagged URL, rel, retailer and placement in one place. */
export function EbaySearchLink({
  region,
  query,
  placement,
  className,
  children,
  title,
  "aria-label": ariaLabel,
}: {
  region: Region;
  /** A product, set or type name, or "" for Pokémon sealed in general. */
  query: string;
  placement: Placement;
  className?: string;
  children: ReactNode;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <OutboundLink
      href={ebaySearchUrl(query, region, placement)}
      rel={REL_SPONSORED}
      retailer={ebayRetailer(region)}
      placement={placement}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </OutboundLink>
  );
}

const Arrow = () => <span aria-hidden="true">↗</span>;

/**
 * The header's "eBay" item, with its "Ad" mark: desktop (xl and up) only. A phone's
 * sticky header would put it on screen with the page's own unit, and from lg to xl
 * the nav has no room for it (the region switcher would be pushed off the edge).
 */
export function EbayNavLink({ region }: { region: Region }) {
  return (
    <span data-ad="header" className="hidden shrink-0 xl:inline-flex">
      <EbaySearchLink
        region={region}
        query=""
        placement="header"
        title="Ad: affiliate link to Pokémon sealed searches on eBay. We may earn a commission, at no cost to you."
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-raised hover:text-ink"
      >
        eBay <AdPill /> <Arrow />
      </EbaySearchLink>
    </span>
  );
}
