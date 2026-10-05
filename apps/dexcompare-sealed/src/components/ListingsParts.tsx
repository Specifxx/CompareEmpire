import type { ReactNode } from "react";
import { AFFILIATE_NOTE, ebayCardSearchUrl, ebayRetailer, ebayRetailerForHref, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import type { Listing } from "@/lib/ebay-context";
import type { Region } from "@/lib/regions";
import { AdPill } from "./Ebay";
import { OutboundLink } from "./OutboundLink";

// The pieces of a "Chase cards on eBay" unit, shared by the listings strip
// (EbayListings.tsx, a client island that fetches /api/ebay/<region>), its skeleton and
// the no-keys search tiles (ChaseCards.tsx, which is a plain server component). No hooks and
// no "use client" here: this file renders on either side.
//
// Every height in a unit is fixed (title: two lines of 18px, price, condition and link lines of
// fixed height, a 3:4 thumbnail box), so the skeleton, the listings and the search tiles are the
// same size and nothing moves when one replaces another (CLS 0). Where the fallback is shorter
// (a native banner), the strip keeps the skeleton's own height underneath it (EbayListings.tsx).

export type Variant = "hero" | "section" | "slim";

const Arrow = () => <span aria-hidden="true">↗</span>;

export const DISCLOSURE_LISTINGS = "Listings from eBay, refreshed about hourly and up to 3 hours older than on eBay. Check eBay for current price, availability and delivery. Prices are before shipping.";
export const DISCLOSURE_SEARCH = "These are searches on eBay, not listings: no price or availability is shown.";

/** The "Ad" label, the eBay name, the heading and (optionally) a trailing action. */
export function UnitHeader({
  heading,
  site = "eBay",
  kind = "sponsored listings",
  variant,
  action,
}: {
  heading: string;
  /** "eBay", or "eBay US" on the landing page, whose feed is the US one. */
  site?: string;
  kind?: string;
  variant: Variant;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <AdPill /> <span>
          {site} · {kind}
        </span>
      </div>
      {/* min-h = the button's own height, so a header without one (the search tiles) is the same height. */}
      <div className="mt-1.5 flex min-h-[30px] items-center justify-between gap-3 sm:min-h-[38px]">
        <p className={`min-w-0 font-display font-bold leading-snug tracking-tight ${variant === "hero" ? "text-base sm:text-2xl" : "text-base sm:text-lg"}`}>{heading}</p>
        {action}
      </div>
    </div>
  );
}

/** The "See more on eBay" button: a tagged eBay card SEARCH, one buy_click like every link. */
export function SeeMore({ region, query, placement, label = "See more on eBay" }: { region: Region; query: string; placement: Placement; label?: string }) {
  return (
    <OutboundLink
      href={ebayCardSearchUrl(query, region, placement)}
      rel={REL_SPONSORED}
      retailer={ebayRetailer(region)}
      placement={placement}
      className="btn-ad shrink-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
    >
      {label} <Arrow />
    </OutboundLink>
  );
}

/** The button's box, inert: it keeps a hidden skeleton's header the height of the real one. */
export function SeeMorePlaceholder({ label = "See more on eBay" }: { label?: string }) {
  return (
    <span aria-hidden="true" className="btn-ad shrink-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
      {label} <Arrow />
    </span>
  );
}

/** The disclosure under every unit: what the tiles are, how fresh, and the affiliate note. */
export function Disclosure({ search = false, className = "" }: { search?: boolean; className?: string }) {
  return (
    <p className={`mt-3 text-xs leading-5 text-muted ${className}`}>
      {search ? DISCLOSURE_SEARCH : DISCLOSURE_LISTINGS} {AFFILIATE_NOTE}
    </p>
  );
}

// ─── Tiles ─────────────────────────────────────────────────────────────────────
// "v": vertical (hero, section); "h": horizontal (slim, and the 2x-wide in-feed tile).

// The "section" strips (set, type, store, releases, product pages) sit near the top of short phone pages, so on a phone
// they use the slim, horizontal tile (a thumbnail beside the text: about a third of the height) and become the tall,
// vertical tile from sm up. "hero" (the home page) stays vertical everywhere: it sits below the stats row.
const TILE_W = { hero: "w-[148px] sm:w-[160px]", section: "w-[248px] sm:w-[148px]", slim: "w-[248px] sm:w-[256px]" } as const;

/** The row: a scroll-snap strip on phones (the unit scrolls, never the page) and a fixed grid from lg. */
export function TileRow({ variant, label, children }: { variant: Variant; label: string; children: ReactNode }) {
  const lg = variant === "slim" ? "lg:grid-cols-4" : "lg:grid-cols-6";
  // `relative`: the row is the containing block of the tiles' sr-only (absolutely positioned) text, so it is clipped with them
  // instead of widening the page. From lg only the first 6 (hero/section) tiles show: the 7th and 8th are for phones' scroll.
  return (
    <ul
      role="list"
      aria-label={label}
      className={`relative mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] lg:grid ${lg} lg:overflow-visible lg:pb-0 ${variant === "slim" ? "" : "lg:[&>li:nth-child(n+7)]:hidden"}`}
    >
      {children}
    </ul>
  );
}

export function TileItem({ variant, children }: { variant: Variant; children: ReactNode }) {
  return <li className={`shrink-0 snap-start lg:w-auto ${TILE_W[variant]}`}>{children}</li>;
}

/** "feed": the horizontal tile inside the 2x-wide in-feed unit, with a larger thumbnail than the slim strip's. */
export type TileVariant = Variant | "feed";
// Per variant: the tile's flex direction, the thumbnail box and the gap between thumbnail and text.
const LAYOUT: Record<TileVariant, { box: string; thumb: string; gap: string }> = {
  hero: { box: "flex-col", thumb: "aspect-[3/4] w-full", gap: "mt-2" },
  section: { box: "flex-row items-stretch sm:flex-col", thumb: "aspect-[3/4] w-14 sm:w-full", gap: "ml-2.5 sm:ml-0 sm:mt-2" },
  slim: { box: "flex-row items-stretch", thumb: "aspect-[3/4] w-14", gap: "ml-2.5" },
  feed: { box: "flex-row items-stretch", thumb: "aspect-[3/4] w-20", gap: "ml-2.5" },
};

const TILE_BOX = "group flex h-full rounded-lg border border-line bg-surface p-2 transition-colors hover:border-ink/40";

/** A real eBay listing. The whole tile is the one link. */
export function ListingTile({ item, href, variant, region, placement }: { item: Listing; href: string; variant: TileVariant; region: Region; placement: Placement }) {
  const L = LAYOUT[variant];
  const body = (
    <>
      <span className={`relative block shrink-0 overflow-hidden rounded-md bg-raised ${L.thumb}`}>
        <img
          src={item.imageUrl}
          alt={item.title.slice(0, 100)}
          width={225}
          height={300}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain"
        />
      </span>
      <span className={`flex min-w-0 flex-1 flex-col ${L.gap}`}>
        <span className="line-clamp-2 block h-9 text-xs font-medium leading-[18px] group-hover:text-brand">{item.title}</span>
        <span className="tabular mt-1 block truncate text-sm font-bold leading-5">{formatPrice(item.price)}</span>
        <span className="block h-4 truncate text-[11px] leading-4 text-muted">{item.condition ?? ""}</span>
        <span className="mt-auto block whitespace-nowrap pt-1 text-xs font-semibold leading-4 text-brand">
          {variant === "slim" ? (
            <>
              View<span className="sr-only"> on eBay</span> <Arrow />
            </>
          ) : (
            <>
              View on eBay <Arrow />
            </>
          )}
        </span>
      </span>
    </>
  );
  return (
    <OutboundLink
      href={href}
      rel={REL_SPONSORED}
      retailer={ebayRetailerForHref(href, region)}
      placement={placement}
      className={`${TILE_BOX} ${L.box}`}
    >
      {body}
    </OutboundLink>
  );
}

/** The same box with grey blocks where the content goes: same size, so nothing shifts when listings arrive. */
export function SkeletonTile({ variant }: { variant: TileVariant }) {
  const pulse = "motion-safe:animate-pulse rounded bg-line";
  const L = LAYOUT[variant];
  return (
    <div aria-hidden="true" className={`${TILE_BOX} ${L.box}`}>
      <span className={`block shrink-0 rounded-md bg-raised ${L.thumb}`} />
      <span className={`flex min-w-0 flex-1 flex-col ${L.gap}`}>
        <span className="block h-9 space-y-1.5 pt-0.5">
          <span className={`block h-3 w-full ${pulse}`} />
          <span className={`block h-3 w-2/3 ${pulse}`} />
        </span>
        <span className="mt-1 flex h-5 items-center">
          <span className={`block h-3.5 w-16 ${pulse}`} />
        </span>
        <span className="block h-4" />
        <span className="mt-auto block pt-1 text-xs leading-4">&nbsp;</span>
      </span>
    </div>
  );
}

/** "$24.99 USD": eBay's amount and currency code as returned (the symbol is only a spelling of the code, never a conversion). */
export function formatPrice(p: { value: string; currency: string }): string {
  const n = Number(p.value);
  try {
    const s = new Intl.NumberFormat("en", { style: "currency", currency: p.currency, currencyDisplay: "narrowSymbol" }).format(n);
    return `${s} ${p.currency}`;
  } catch {
    return `${p.value} ${p.currency}`;
  }
}
