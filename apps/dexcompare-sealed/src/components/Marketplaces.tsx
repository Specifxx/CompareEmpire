import type { ReactNode } from "react";
import {
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
import { money } from "@/lib/format";
import { REGIONS, type Region } from "@/lib/regions";
import { offerStock } from "@/lib/sealed-offers";
import { OutboundLink } from "./OutboundLink";
import { StockPill } from "./StockPill";

// The marketplace links: eBay (EPN search) and TCGplayer (Impact). These are the
// site's only paid links, so every group of them carries its own disclosure —
// the FTC wants it next to the links, not only in the footer.
//
// TCGplayer is a US marketplace. In the US it is also one of the product's
// offers and ranks with the stores; everywhere else it is shown here, labelled
// as US$, and never enters the region's comparison.

export const AFFILIATE_NOTE = "Affiliate links — we may earn a commission, at no cost to you.";

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

const ROW = "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 text-sm transition-colors hover:bg-raised";
// Muted, not faint: a disclosure must be as readable as what it discloses (WCAG AA).
const NOTE = "text-xs leading-5 text-muted";

/** Product page, under the best-price card: eBay and TCGplayer, in every region. */
export function MarketplacePanel({
  region,
  productName,
  preorder,
  tcgplayer,
  tcgplayerIsBest = false,
}: {
  region: Region;
  productName: string;
  preorder: boolean;
  /** US: TCGplayer's row in the offer table. Elsewhere: the US$ offer (usMarketplace). */
  tcgplayer: TcgplayerMatch | null;
  /** US: TCGplayer is the best price above, so its button is already there. */
  tcgplayerIsBest?: boolean;
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
    <div className="card mt-3 overflow-hidden">
      <h2 className="eyebrow border-b border-line bg-raised px-5 py-2.5">Marketplaces</h2>
      <ul className="divide-y divide-line">
        <li>
          <OutboundLink
            href={ebaySearchUrl(ebayQuery(productName, tcgplayer), region, "product-marketplace")}
            rel={REL_SPONSORED}
            retailer={ebayRetailer(region)}
            placement="product-marketplace"
            className={ROW}
          >
            <span className="min-w-0">
              <b>eBay</b> <span className="text-muted">— Buy It Now listings on {ebayLabel(region)}</span>
            </span>
            <span className="ml-auto shrink-0 font-semibold text-brand">
              Search eBay <span aria-hidden="true">↗</span>
            </span>
          </OutboundLink>
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
}: {
  region: Region;
  productName: string;
  /** Stores (not marketplaces) in this region that list the product. */
  storesListing: number;
  /** …of which we couldn't read recently, so "sold out" is a guess for them. */
  notChecked: number;
  tcgplayer: TcgplayerMatch | null;
}) {
  const r = REGIONS[region];
  const us = r.market === "US";
  const tcg = tcgplayerLink(region, productName, tcgplayer, "product-soldout");
  const tcgOpen = !us && tcgplayer && offerStock(tcgplayer) === "open";
  const big = "px-6 py-3 text-base";
  const ebayBtn = (
    <OutboundLink
      href={ebaySearchUrl(ebayQuery(productName, tcgplayer), region, "product-soldout")}
      rel={REL_SPONSORED}
      retailer={ebayRetailer(region)}
      placement="product-soldout"
      className={`${us ? "btn-ghost" : "btn-primary"} ${big}`}
    >
      Buy It Now on eBay <span aria-hidden="true">↗</span>
    </OutboundLink>
  );
  const tcgBtn = (
    <OutboundLink href={tcg.href} rel={tcg.rel} retailer={TCGPLAYER_RETAILER} placement="product-soldout" className={`${us ? "btn-primary" : "btn-ghost"} ${big}`}>
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
    <div className="card mt-6 p-5 sm:p-6">
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
      <div className="mt-4 flex flex-wrap gap-2.5">
        {us ? (
          <>
            {tcgBtn}
            {ebayBtn}
          </>
        ) : (
          <>
            {ebayBtn}
            {tcgBtn}
          </>
        )}
      </div>
      <p className={`mt-3 ${NOTE}`}>
        {AFFILIATE_NOTE} eBay links go to {ebayLabel(region)}.
        {!us && ` TCGplayer sells in US$ from the US; check it ships to ${r.name} before you buy.`}
      </p>
    </div>
  );
}

/** A slim "Shop … on eBay and TCGplayer" line (set and type pages). */
export function MarketplaceBanner({ region, title, query, placement }: { region: Region; title: string; query: string; placement: Placement }) {
  const us = REGIONS[region].market === "US";
  return (
    <div className="card mt-4 flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <b>{title}</b> <span className="text-xs text-muted">· {AFFILIATE_NOTE}</span>
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <OutboundLink href={ebaySearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={ebayRetailer(region)} placement={placement} className="chip font-semibold">
          eBay <span aria-hidden="true">↗</span>
        </OutboundLink>
        <OutboundLink href={tcgplayerSearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement={placement} className="chip font-semibold">
          TCGplayer{us ? "" : " (US)"} <span aria-hidden="true">↗</span>
        </OutboundLink>
      </div>
    </div>
  );
}

/** One line of marketplace searches, for the region home page's hero. */
export function MarketplaceHint({ region }: { region: Region }) {
  const us = REGIONS[region].market === "US";
  const link = "font-semibold text-brand hover:underline";
  return (
    <p className="mt-5 text-sm text-muted">
      Can&rsquo;t find it in stock? Search{" "}
      <OutboundLink href={ebaySearchUrl("", region, "region-home")} rel={REL_SPONSORED} retailer={ebayRetailer(region)} placement="region-home" className={link}>
        eBay <span aria-hidden="true">↗</span>
      </OutboundLink>{" "}
      or{" "}
      <OutboundLink href={tcgplayerSearchUrl("", region, "region-home")} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement="region-home" className={link}>
        TCGplayer{us ? "" : " (US)"} <span aria-hidden="true">↗</span>
      </OutboundLink>{" "}
      <span>(affiliate links)</span>
    </p>
  );
}

/** Search buttons for a free-text query (the browse page's "nothing matches"). */
export function MarketplaceSearch({ region, query, placement }: { region: Region; query: string; placement: Placement }) {
  const us = REGIONS[region].market === "US";
  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <OutboundLink href={ebaySearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={ebayRetailer(region)} placement={placement} className="btn-primary max-w-full">
          <span className="truncate">Search eBay for &ldquo;{query}&rdquo;</span> <span aria-hidden="true">↗</span>
        </OutboundLink>
        <OutboundLink href={tcgplayerSearchUrl(query, region, placement)} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement={placement} className="btn-ghost">
          Search TCGplayer{us ? "" : " (US)"} <span aria-hidden="true">↗</span>
        </OutboundLink>
      </div>
      <p className={NOTE}>{AFFILIATE_NOTE}</p>
    </div>
  );
}
