import type { ReactNode } from "react";
import { AFFILIATE_NOTE, AFFILIATE_NOTE_SHORT, creativeHref, creativeRetailer, EBAY_BANNER, ebayLabel, ebayRetailer, ebaySearchUrl, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import { typeChips, type EbayChip } from "@/lib/ebay-ads";
import type { Region } from "@/lib/regions";
import { OutboundLink } from "./OutboundLink";

// The eBay units: one small, consistent set of sponsored blocks.
//
// What they all do, and never do:
//   • Each is a plain <a> to an EPN-tagged eBay SEARCH (ebaySearchUrl), through
//     OutboundLink: one buy_click {retailer, placement} per click, no redirect hop.
//     rel is "sponsored nofollow noopener noreferrer". No eBay API, no eBay price,
//     count or "deal": we know none of those.
//   • Each is visibly an ad: an "Ad" pill, the word "eBay", and (per group) the
//     affiliate disclosure. The dashed, cool-tinted .ad-box is a look no store row
//     or product card has, so none of them reads as a listing or a ranked result.
//   • None is part of a ranking, a count, a median, JSON-LD, meta or the sitemap:
//     they are separate elements beside the data, never in it.
//   • No logo (the word "eBay" in text), no script, no iframe, no overlay, no
//     countdown. Fixed-size markup, so nothing shifts when it paints.
// Every unit's root carries data-ad="<placement>" for the verification sweep.

/** The small "Ad" label. */
export function AdPill({ className = "" }: { className?: string }) {
  return <span className={`ad-pill ${className}`}>Ad</span>;
}

/**
 * Put on a page whose own units leave no room for the banner above the footer
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
 * "Also on eBay:" — a row of searches (the chips come from lib/ebay-ads.ts, at
 * most five). Standalone it is its own unit; `bare` puts it inside another
 * eBay unit (the product page's marketplace panel, a banner) that already
 * carries the label and disclosure, so the pair counts as one.
 */
export function EbayQuickSearches({
  region,
  chips,
  placement,
  label = "Also on eBay:",
  bare = false,
  max = 5,
  className = "",
}: {
  region: Region;
  chips: EbayChip[];
  placement: Placement;
  label?: string;
  bare?: boolean;
  /** At most this many chips. 5 for a product's "Also on eBay"; a banner's own row of product types may use 6. */
  max?: number;
  className?: string;
}) {
  const shown = chips.slice(0, max);
  if (!shown.length) return null;
  const row = (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
        <AdPill /> {label}
      </span>
      {shown.map((c) => (
        <EbaySearchLink key={c.id} region={region} query={c.query} placement={placement} className="ad-chip">
          {c.label}
          <span className="sr-only"> on eBay</span> <Arrow />
        </EbaySearchLink>
      ))}
    </div>
  );
  if (bare) return row;
  return (
    <div data-ad={placement} role="group" aria-label="Sponsored: eBay searches" className="ad-box mt-3 px-4 py-3">
      {row}
      <p className="mt-2 text-xs text-muted">{AFFILIATE_NOTE}</p>
    </div>
  );
}

/**
 * The wide banner. "hero" (region home), "section" (set, type, releases, store
 * pages) and "footer" (above every page's footer). With a valid EPN creative in
 * the environment (affiliate.ts EBAY_BANNER) the hero and footer show that image
 * instead of the native banner, under the same Ad label and disclosure.
 */
export function EbayBanner({
  region,
  variant,
  placement,
  title = "Shop Pokémon sealed on eBay",
  text,
  query = "",
  chips,
  chipsPlacement,
  className = "",
}: {
  region: Region;
  variant: "hero" | "section" | "footer";
  placement: Placement;
  title?: string;
  /** One line of context. Never a claim about eBay's prices or stock. */
  text?: string;
  /** What the button searches for: "" is Pokémon sealed in general. */
  query?: string;
  /** Quick-search chips. Default: one per product type (none on "section", where the page says which). */
  chips?: EbayChip[];
  /** The placement the chips report under, when it should differ from the banner's (set page: "set-related"). */
  chipsPlacement?: Placement;
  className?: string;
}) {
  const site = ebayLabel(region);
  const creative = variant !== "section" ? EBAY_BANNER : null;
  const hero = variant === "hero";

  if (creative) {
    return (
      <div data-ad={placement} role="group" aria-label="Sponsored: eBay" className={`ad-box p-3 sm:p-4 ${className}`}>
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <AdPill /> <span>eBay · sponsored link</span>
        </div>
        <OutboundLink href={creativeHref(creative.href, region, placement)} rel={REL_SPONSORED} retailer={creativeRetailer(creative.href)} placement={placement} className="mx-auto block w-fit max-w-full">
          <img src={creative.image} alt={creative.alt} width={creative.width} height={creative.height} loading="lazy" decoding="async" className="h-auto max-w-full" />
        </OutboundLink>
        <p className="mt-2 text-xs text-muted">{AFFILIATE_NOTE}</p>
      </div>
    );
  }

  const list = chips ?? (variant === "section" ? [] : typeChips());
  const sub = text ?? `Search Buy It Now listings on ${site}.`;
  // On a phone the section banner is a compact strip (title and button on one row, no
  // body line or chip row): set, type and store pages must show their own content first.
  const section = variant === "section";
  return (
    <div data-ad={placement} role="group" aria-label="Sponsored: eBay" className={`ad-box ${hero ? "p-5 sm:p-6" : "p-3 sm:p-5"} ${className}`}>
      <div className={`flex gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${section ? "items-center" : "flex-col"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <AdPill /> <span>eBay · sponsored link</span>
          </div>
          <p className={`mt-1.5 font-display font-bold leading-snug tracking-tight ${hero ? "text-xl sm:text-2xl" : section ? "text-base sm:text-lg" : "text-lg"}`}>{title}</p>
          <p className={`mt-1 text-sm text-muted ${section ? "hidden sm:block" : ""}`}>{sub}</p>
        </div>
        <EbaySearchLink
          region={region}
          query={query}
          placement={placement}
          className={`btn-ad shrink-0 ${section ? "px-3 sm:px-4" : "self-start sm:self-center"} ${hero ? "px-6 py-3 text-base" : ""}`}
        >
          Search eBay <Arrow />
        </EbaySearchLink>
      </div>
      {list.length > 0 && (
        <EbayQuickSearches bare region={region} chips={list} placement={chipsPlacement ?? placement} label="Search eBay by type:" max={6} className={`mt-4 ${section ? "hidden sm:flex" : ""}`} />
      )}
      <p className="mt-2 text-xs text-muted sm:mt-3">{AFFILIATE_NOTE}</p>
    </div>
  );
}

/**
 * A promo tile for a product grid, the footprint of a ProductCard but
 * unmistakably not one: dashed, tinted, "Ad", and no price. Placed by
 * lib/ebay-ads.ts withFeed (after the 12th, 24th and 36th product).
 */
export function EbayFeedCard({ region, context, query, placement }: { region: Region; context: string; query: string; placement: Placement }) {
  return (
    <div data-ad={placement} role="group" aria-label="Sponsored: eBay search" className="flex">
      <EbaySearchLink
        region={region}
        query={query}
        placement={placement}
        className="group ad-box flex flex-1 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift"
      >
        <span className="relative block aspect-square">
          <span className="absolute left-3 top-3">
            <AdPill />
          </span>
          <span className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10 text-muted" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5" />
            </svg>
            <span className="text-sm font-semibold text-muted">Sponsored search</span>
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <span className="block min-h-[2.5rem]">
            <span className="line-clamp-2 block text-sm font-semibold leading-snug group-hover:text-brand sm:text-[15px]">Search {context} on eBay</span>
            <span className="mt-0.5 block text-xs text-faint">Buy It Now listings on {ebayLabel(region)}</span>
          </span>
          <span className="block text-[11px] leading-4 text-muted">{AFFILIATE_NOTE}</span>
          <span className="btn-ad mt-auto w-fit">
            Search eBay <Arrow />
          </span>
        </span>
      </EbaySearchLink>
    </div>
  );
}

/**
 * The height every card in a sold-out link's grid row keeps free under it
 * (SoldOutSpacer on the row-mates), so the row's cards stay the same height and
 * their price blocks line up. Fixed, so the link never moves the page.
 */
const SOLDOUT_SLOT = "mt-1.5 h-[3.5rem]";

/**
 * Under a sold-out product card, outside the card's own link (anchors never nest):
 * "Ad", the search, and the short affiliate disclosure right beside it.
 */
export function EbaySoldOutLink({ region, name }: { region: Region; name: string }) {
  return (
    <div data-ad="card-soldout" role="group" aria-label="Sponsored: eBay search" className={`${SOLDOUT_SLOT} px-0.5 text-xs`}>
      <div className="flex items-start gap-1.5 leading-[18px]">
        <AdPill />
        <EbaySearchLink region={region} query={name} placement="card-soldout" className="min-w-0 font-semibold text-brand hover:underline">
          Search on eBay<span className="sr-only"> for {name}</span> <Arrow />
        </EbaySearchLink>
      </div>
      <p className="mt-0.5 text-[11px] leading-4 text-muted">{AFFILIATE_NOTE_SHORT}</p>
    </div>
  );
}

/** Blank space the size of EbaySoldOutLink, under a card that shares a grid row with one. `show` is the breakpoint classes (ebay-ads.ts soldOutMates). */
export function SoldOutSpacer({ show }: { show: string }) {
  return <div aria-hidden="true" className={`${SOLDOUT_SLOT} ${show}`} />;
}

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
