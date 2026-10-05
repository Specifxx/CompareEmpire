import { ebayCardSearchUrl, ebayRetailer, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import { CHASE_CARDS, CHASE_IMAGE } from "@/lib/chase-cards";
import type { Region } from "@/lib/regions";
import { Disclosure, TileItem, TileRow, UnitHeader } from "./ListingsParts";
import { OutboundLink } from "./OutboundLink";

/**
 * The home and landing "Chase cards" unit when there are no eBay listings to show (no
 * keys, the kill switch, or an error): six curated chase cards, each a card-art thumbnail,
 * its name and a SEARCH on eBay for it. It says so: "Search eBay for…", no price, and a
 * line that these are searches, not listings. A plain server component: no script, and the
 * same fixed-height tiles as the listings strip, so the two swap without moving the page
 * (where it stands in for a loading strip, the strip keeps the unit's height under it).
 */
export function ChaseSearchStrip({
  region,
  placement,
  site = "eBay",
  className = "",
}: {
  region: Region;
  placement: Placement;
  /** "eBay US" on the landing page. */
  site?: string;
  className?: string;
}) {
  return (
    <div data-ad={placement} role="group" aria-label="Sponsored: eBay chase card searches" className={`ad-box p-4 sm:p-5 ${className}`}>
      <UnitHeader heading="Search eBay for chase cards" site={site} kind="sponsored searches" variant="hero" />
      <TileRow variant="hero" label="Chase card searches on eBay (ads)">
        {CHASE_CARDS.map((c) => (
          <TileItem key={c.id} variant="hero">
            <OutboundLink
              href={ebayCardSearchUrl(c.query, region, placement)}
              rel={REL_SPONSORED}
              retailer={ebayRetailer(region)}
              placement={placement}
              className="group flex h-full flex-col rounded-lg border border-line bg-surface p-2 transition-colors hover:border-ink/40"
            >
              <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-md bg-raised">
                <img
                  src={c.image}
                  alt={`${c.name}, ${c.set}`}
                  width={CHASE_IMAGE.width}
                  height={CHASE_IMAGE.height}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-contain p-1"
                />
              </span>
              <span className="mt-2 flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 block h-9 text-sm font-semibold leading-[18px] group-hover:text-brand">{c.name}</span>
                <span className="mt-1 block truncate text-xs leading-5 text-muted">{c.set}</span>
                <span className="block h-4 truncate text-[11px] leading-4 text-muted">Search, not a listing</span>
                <span className="mt-auto block pt-1 text-xs font-semibold leading-4 text-brand">
                  Search on eBay <span aria-hidden="true">↗</span>
                </span>
              </span>
            </OutboundLink>
          </TileItem>
        ))}
      </TileRow>
      <Disclosure search />
    </div>
  );
}
