import type { ReactNode } from "react";
import {
  AFFILIATE_NOTE,
  ebayLabel,
  ebayRetailer,
  ebaySearchUrl,
  offerLink,
  REL_SPONSORED,
  TCGPLAYER_KEY,
  TCGPLAYER_RETAILER,
  tcgplayerSearchUrl,
  type OutboundHref,
  type Placement,
} from "@/lib/affiliate";
import type { EbayChip } from "@/lib/ebay-ads";
import { money } from "@/lib/format";
import { REGIONS, type Region } from "@/lib/regions";
import { offerStock } from "@/lib/sealed-offers";
import { AdPill, EbayQuickSearches } from "./Ebay";
import { OutboundLink } from "./OutboundLink";
import { StockPill } from "./StockPill";

// The marketplace links: eBay (EPN search) and TCGplayer (Impact). These are the
// site's only paid links, so every group of them carries its own disclosure —
// the FTC wants it next to the links, not only in the footer.
//
// TCGplayer is a US marketplace. In the US it is also one of the product's
// offers and ranks with the stores; everywhere else it is shown here, labelled
// as US$, and never enters the region's comparison.

export { AFFILIATE_NOTE };

/** The fields of a matched TCGplayer offer the marketplace links need (an OfferView or usMarketplace). */
export interface TcgplayerMatch {
  title: string; // TCGplayer's own product name: also the cleanest eBay search for it
  url: string;
  priceCents: number;
  inStock: boolean;
  lastSeen: string;
}

/** "US$54.99": outside the US a TCGplayer price is never shown as a bare "$". */
export function usd(cents: number): string {
  return `US${money(cents, "US")}`;
}

/** The matched product if we have one, else a search. Both wrapped. */
function tcgplayerLink(region: Region, name: string, match: TcgplayerMatch | null, placement: Placement): OutboundHref {
  if (match) return offerLink(TCGPLAYER_KEY, match.url, region, placement);
  return { href: tcgplayerSearchUrl(name, region, placement), rel: REL_SPONSORED, sponsored: true };
}

/** What to search eBay for: TCGplayer's clean name for the product when we have it, else ours. */
export function ebayQuery(productName: string, tcgplayer: Pick<TcgplayerMatch, "title"> | null | undefined): string {
  return tcgplayer?.title || productName;
}

// The focus ring is drawn inside (-2px): these rows sit in an overflow-hidden card, which would clip it.
const ROW = "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 text-sm transition-colors hover:bg-raised focus-visible:outline-offset-[-2px]";
// Muted, not faint: a disclosure must be as readable as what it discloses (WCAG AA).
const NOTE = "text-xs leading-5 text-muted";

/** Product page, under the best-price card: eBay and TCGplayer, in every region. */
export function MarketplacePanel({
  region,
  productName,
  preorder,
  tcgplayer,
  tcgplayerIsBest = false,
  ebayPrimary = false,
  quick = [],
}: {
  region: Region;
  productName: string;
  preorder: boolean;
  /** US: TCGplayer's row in the offer table. Elsewhere: the US$ offer (usMarketplace). */
  tcgplayer: TcgplayerMatch | null;
  /** US: TCGplayer is the best price above, so its button is already there. */
  tcgplayerIsBest?: boolean;
  /** Only one store has it in stock: the eBay row becomes a button, the page's one primary marketplace action. */
  ebayPrimary?: boolean;
  /** "Also on eBay": the product's set x type searches (lib/ebay-ads.ts quickSearches), inside this same unit. */
  quick?: EbayChip[];
}) {
  const r = REGIONS[region];
  const us = r.market === "US";
  const tcg = tcgplayerLink(region, productName, tcgplayer, "product-marketplace");
  const state = tcgplayer ? offerStock(tcgplayer) : null;
  // In the US a matched TCGplayer offer is already ranked in the table (and,
  // when cheapest, is the best-price button): no second price or pill here,
  // and no row at all when it would repeat the button just above.
  const showTcg = !(us && tcgplayer && tcgplayerIsBest);
  let tcgText: ReactNode;
  if (!tcgplayer) {
    tcgText = (
      <>
        <b>TCGplayer</b> <span className="text-muted">— {us ? "search its Pokémon sealed listings" : "US marketplace, prices in US$"}</span>
      </>
    );
  } else if (us) {
    tcgText = (
      <>
        <b>TCGplayer</b> <span className="text-muted">— {state === "open" ? (preorder ? "pre-order" : "in stock") : state === "soldout" ? "sold out" : "not checked recently"}, ranked in the table below</span>
      </>
    );
  } else if (state === "open") {
    tcgText = (
      <>
        <b className="tabular">{usd(tcgplayer.priceCents)} on TCGplayer</b> <span className="text-muted">(US marketplace, prices in US$)</span>
      </>
    );
  } else {
    tcgText = (
      <>
        <b>TCGplayer</b>{" "}
        <span className="text-muted">— {state === "soldout" ? "sold out" : "not checked recently"} (US marketplace, prices in US$)</span>
      </>
    );
  }
  return (
    <div data-ad="product-marketplace" className="card mt-3 overflow-hidden">
      <h2 className="eyebrow border-b border-line bg-raised px-5 py-2.5">Marketplaces</h2>
      <ul className="divide-y divide-line">
        <li className="bg-ad">
          <OutboundLink
            href={ebaySearchUrl(ebayQuery(productName, tcgplayer), region, "product-marketplace")}
            rel={REL_SPONSORED}
            retailer={ebayRetailer(region)}
            placement="product-marketplace"
            className={ROW}
          >
            <span className="min-w-0">
              <b>eBay</b> <AdPill className="mx-0.5 align-middle" /> <span className="text-muted">— Buy It Now listings on {ebayLabel(region)}</span>
            </span>
            {ebayPrimary ? (
              <span className="btn-ad ml-auto shrink-0">
                Search eBay <span aria-hidden="true">↗</span>
              </span>
            ) : (
              <span className="ml-auto shrink-0 font-semibold text-brand">
                Search eBay <span aria-hidden="true">↗</span>
              </span>
            )}
          </OutboundLink>
          {quick.length > 0 && (
            <div className="border-t border-dashed border-ad-line px-5 py-3">
              <EbayQuickSearches bare region={region} chips={quick} placement="product-related" />
            </div>
          )}
        </li>
        {showTcg && (
          <li>
            <OutboundLink href={tcg.href} rel={tcg.rel} retailer={TCGPLAYER_RETAILER} placement="product-marketplace" className={ROW}>
              <span className="min-w-0">{tcgText}</span>
              <span className="ml-auto flex shrink-0 items-center gap-3">
                <span className="font-semibold text-brand">
                  {tcgplayer ? "View on TCGplayer" : "Search TCGplayer"} <span aria-hidden="true">↗</span>
                </span>
              </span>
            </OutboundLink>
          </li>
        )}
      </ul>
      <p className={`border-t border-line px-5 py-2.5 ${NOTE}`}>
        {AFFILIATE_NOTE}
        {!us && ` TCGplayer sells in US$ from the US; check it ships to ${r.name} before you buy.`}
      </p>
    </div>
  );
}

/**
 * Product page, in place of the best-price card when nothing in the region is
 * open (in stock or pre-order): say so plainly, then the marketplaces, big.
 */
export function SoldOutCallout({
  region,
  productName,
  storesListing,
  notChecked,
  tcgplayer,
  quick = [],
}: {
  region: Region;
  productName: string;
  /** Stores (not marketplaces) in this region that list the product. */
  storesListing: number;
  /** …of which we couldn't read recently, so "sold out" is a guess for them. */
  notChecked: number;
  tcgplayer: TcgplayerMatch | null;
  /** "Also on eBay": the product's set x type searches, inside this same unit. */
  quick?: EbayChip[];
}) {
  const r = REGIONS[region];
  const us = r.market === "US";
  const tcg = tcgplayerLink(region, productName, tcgplayer, "product-soldout");
  const tcgOpen = !us && tcgplayer && offerStock(tcgplayer) === "open";
  const big = "px-6 py-3 text-base";
  // Sold out here: eBay is the page's primary marketplace action in every region.
  const ebayBtn = (
    <span className="inline-flex">
      <OutboundLink
        href={ebaySearchUrl(ebayQuery(productName, tcgplayer), region, "product-soldout")}
        rel={REL_SPONSORED}
        retailer={ebayRetailer(region)}
        placement="product-soldout"
        className={`btn-ad ${big}`}
      >
        <AdPill /> Search eBay for Buy It Now <span aria-hidden="true">↗</span>
      </OutboundLink>
    </span>
  );
  const tcgBtn = (
    <OutboundLink href={tcg.href} rel={tcg.rel} retailer={TCGPLAYER_RETAILER} placement="product-soldout" className={`btn-ghost ${big}`}>
      {tcgOpen ? (
        <span className="tabular">{usd(tcgplayer!.priceCents)} on TCGplayer (US)</span>
      ) : (
        <span>
          {tcgplayer ? "Check" : "Search"} TCGplayer{us ? "" : " (US)"}
        </span>
      )}
      <span aria-hidden="true">↗</span>
    </OutboundLink>
  );
  return (
    <div data-ad="product-soldout" className="card mt-6 p-5 sm:p-6">
      <StockPill state="soldout">Sold out</StockPill>
      <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight">
        {storesListing ? `Sold out at every ${r.adjective} store we track` : `No ${r.adjective} store we track lists this yet`}
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        {storesListing > 0 && (
          <>
            {storesListing === 1 ? "The one store that lists it doesn’t have" : `None of the ${storesListing} stores that list it has`} it in stock
            {notChecked > 0 && ` (${notChecked} not checked recently)`}.{" "}
          </>
        )}
        Marketplaces may still have it:
      </p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {ebayBtn}
        {tcgBtn}
      </div>
      {quick.length > 0 && <EbayQuickSearches bare region={region} chips={quick} placement="product-related" className="mt-4" />}
      <p className={`mt-3 ${NOTE}`}>
        {AFFILIATE_NOTE} eBay links go to {ebayLabel(region)}.
        {!us && ` TCGplayer sells in US$ from the US; check it ships to ${r.name} before you buy.`}
      </p>
    </div>
  );
}

/**
 * The browse page's "nothing matches": the same words on eBay and TCGplayer.
 * The eBay half is a labelled unit; it stands in for the footer banner, which
 * the grid drops while this shows (NoPreFooter).
 */
export function MarketplaceSearch({ region, query, placement }: { region: Region; query: string; placement: Placement }) {
  const us = REGIONS[region].market === "US";
  return (
    <div data-ad={placement} role="group" aria-label="Sponsored: eBay and TCGplayer searches" className="ad-box mx-auto mt-6 max-w-xl p-5">
      <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted">
        <AdPill /> <span>eBay · sponsored link</span>
      </div>
      <p className="mt-2 font-display text-lg font-bold leading-snug text-ink">No store we track matches. Search for it on eBay?</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <OutboundLink href={ebaySearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={ebayRetailer(region)} placement={placement} className="btn-ad max-w-full px-6 py-3 text-base">
          <span className="truncate">Search eBay for &ldquo;{query}&rdquo;</span> <span aria-hidden="true">↗</span>
        </OutboundLink>
        <OutboundLink href={tcgplayerSearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement={placement} className="btn-ghost px-5 py-3 text-base">
          Search TCGplayer{us ? "" : " (US)"} <span aria-hidden="true">↗</span>
        </OutboundLink>
      </div>
      <p className={`mt-3 ${NOTE}`}>{AFFILIATE_NOTE}</p>
    </div>
  );
}
