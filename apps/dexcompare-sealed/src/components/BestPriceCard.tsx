"use client";

import type { ReactNode } from "react";
import { ebayRetailerForHref, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import type { PriceFloor } from "@/lib/ebay-offer-row";
import { medianSaving, money, pctOf, plural } from "@/lib/format";
import type { Region } from "@/lib/regions";
import { EbayMark } from "./EbayMark";
import { useEbayPick } from "./EbayStrip";
import { OutboundLink } from "./OutboundLink";
import { StockPill } from "./StockPill";

// The product page's best-price card. The best price is the cheapest store you can buy from, OR the product's eBay listing when that is
// cheaper (the owner's call, 2026-10-11: "eBay's price counts as the cheapest price if it is the cheapest"). The listing is the one the
// price table's eBay row shows (EbayStrip.tsx useEbayPick: the same request, the same pick), fetched in the browser as the page runs: the
// server HTML is the store's card, and the card turns to eBay's only when the listing arrives and is cheaper.
//
// Nothing moves when it does (the card is in the first screen): the store's and eBay's headlines are stacked in one grid cell, the one not
// shown kept invisible, so the cell is as tall as the taller of the two from the first paint; eBay's has fixed one-line rows. The lines
// under the headline (the median and MSRP badges, "you save … by buying at the cheapest", "best price N% below MSRP") are recomputed for
// whichever price is the best, but shown only where the store's card shows them, so none appears or vanishes.
//
// When eBay's listing is the best price it is labelled as what it is: the eBay wordmark, "Ad", how old the listing is, eBay's blue
// button, and the cheapest store's price under it. JSON-LD, meta tags and the "from" prices elsewhere stay the stores' (server-rendered,
// cached for a day: an eBay price there would outlive its age bound).

export interface BestStore {
  cents: number;
  /** "at TCGORA", "on TCGplayer" */
  where: string;
  marketplace: boolean;
  href: string;
  rel: string;
  sponsored: boolean;
  retailer: string;
  button: string;
}

export interface BestPriceCardProps {
  region: Region;
  market: string;
  adjective: string;
  preorder: boolean;
  store: BestStore;
  /** Packs in one unit, for "≈ … per pack". Null = not shown. */
  packs: number | null;
  median: number | null;
  medianStores: number;
  msrp: number | null;
  openStores: number;
  storeCount: number;
  tcgOpen: boolean;
  /** In-stock offers (stores and TCGplayer) and the dearest of them, for "up to … — you save …". */
  openCount: number;
  highestOpenCents: number;
  /** The product's eBay listing, in the stores' currency only (not NZ or SG). Null = the stores' card only. */
  ebay: { slug: string; floor: PriceFloor | null; packs: number | null } | null;
}

const placement: Placement = "listings-best-price";

export function BestPriceCard(props: BestPriceCardProps) {
  return props.ebay ? <WithEbay {...props} ebay={props.ebay} /> : <Card {...props} ebayCents={null} headline={<StoreHeadline {...props} />} />;
}

function WithEbay(props: BestPriceCardProps & { ebay: NonNullable<BestPriceCardProps["ebay"]> }) {
  const { region, ebay, store } = props;
  const { ref, item, cents, age } = useEbayPick({ region, slug: ebay.slug, floor: ebay.floor, packs: ebay.packs, placement });
  const cheaper = item != null && cents != null && cents < store.cents;
  const headline = (
    <div ref={ref} className="grid grid-cols-[minmax(0,1fr)]">
      <div className={`col-start-1 row-start-1 ${cheaper ? "invisible" : ""}`} aria-hidden={cheaper || undefined}>
        <StoreHeadline {...props} />
      </div>
      <div className={`col-start-1 row-start-1 ${cheaper ? "" : "invisible"}`} aria-hidden={!cheaper || undefined}>
        <EbayHeadline {...props} cents={cheaper ? cents : null} href={cheaper ? item.href : null} title={cheaper ? item.title : ""} age={cheaper ? age : ""} />
      </div>
    </div>
  );
  return <Card {...props} ebayCents={cheaper ? cents : null} headline={headline} />;
}

function StoreHeadline({ preorder, store, packs, market }: BestPriceCardProps) {
  const perPack = packs ? Math.round(store.cents / packs) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-muted">{preorder ? "Cheapest pre-order" : "Best price in stock"}</div>
        <div className="tabular font-display text-4xl font-extrabold tracking-tight">{money(store.cents, market)}</div>
        {perPack != null && <div className="tabular mt-0.5 text-sm text-muted">≈ {money(perPack, market)} per pack</div>}
        <div className="mt-1 text-sm text-muted">
          {store.where}
          {store.sponsored && <span> · marketplace · affiliate link</span>}
        </div>
      </div>
      <OutboundLink href={store.href} rel={store.rel} retailer={store.retailer} placement="product-best" className="btn-primary px-6 py-3 text-base">
        {store.button} <span aria-hidden="true">↗</span>
      </OutboundLink>
    </div>
  );
}

/** eBay's headline: one line per row (nothing wraps), so it is as tall as a placeholder before the listing arrives. */
function EbayHeadline({ region, market, packs, store, cents, href, title, age }: BestPriceCardProps & { cents: number | null; href: string | null; title: string; age: string }) {
  const shown = cents ?? store.cents; // the invisible placeholder takes the store's figures: same widths, roughly
  const perPack = packs ? Math.round(shown / packs) : null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium text-muted">Best price in stock</div>
        <div className="tabular whitespace-nowrap font-display text-4xl font-extrabold tracking-tight">{money(shown, market)}</div>
        {perPack != null && <div className="tabular mt-0.5 whitespace-nowrap text-sm text-muted">≈ {money(perPack, market)} per pack</div>}
        <div className="mt-1 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm text-muted" title={title || undefined}>
          <span>on</span>
          <EbayMark className="text-base" />
          <span className="ad-pill">Ad</span>
          {/* the listing's age first: on a phone only the store's price is cut */}
          <span className="shrink-0">· updated {age || "26 h ago"}</span>
          <span className="truncate">· cheapest store {money(store.cents, market)}</span>
        </div>
      </div>
      {href ? (
        <OutboundLink
          href={href}
          rel={REL_SPONSORED}
          retailer={ebayRetailerForHref(href, region)}
          placement={placement}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-[#3665f3] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2a50c8] sm:self-auto"
        >
          View on eBay <span aria-hidden="true">↗</span>
          <span className="sr-only"> (ad): {title}</span>
        </OutboundLink>
      ) : (
        <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full px-6 py-3 text-base font-semibold sm:self-auto">
          View on eBay <span aria-hidden="true">↗</span>
        </span>
      )}
    </div>
  );
}

/** The card around the headline. `ebayCents` set: eBay's listing is the best price, and the lines under the headline follow it. */
function Card({ headline, ebayCents, ...p }: BestPriceCardProps & { headline: ReactNode; ebayCents: number | null }) {
  const { market, preorder, store, median, medianStores, msrp } = p;
  const bestCents = ebayCents ?? store.cents;
  // shown where the store's card shows them (so nothing appears or vanishes), with the best price's figures
  const storeSaving = medianSaving(store.cents, median, medianStores);
  const storeVsMsrp = msrp != null ? pctOf(store.cents, msrp) : null;
  const saving = storeSaving ? medianSaving(bestCents, median, medianStores) ?? storeSaving : null;
  const vsMsrp = msrp != null ? pctOf(bestCents, msrp) : null;
  const msrpBadge = storeVsMsrp != null && storeVsMsrp < 0 && vsMsrp != null && vsMsrp < 0;
  return (
    <div className="card mt-6 p-5">
      {headline}
      {(saving || msrpBadge) && (
        <p className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-open">
          {saving && <span>{saving}</span>}
          {msrpBadge && <span className="rounded-full border border-open/40 px-2">{-vsMsrp!}% below US MSRP</span>}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
        <StockPill state="open" preorder={preorder}>
          {preorder ? "Pre-order" : "In stock"}{" "}
          {p.openStores ? `at ${p.openStores} of ${plural(p.storeCount, "store")}${p.tcgOpen ? " + TCGplayer" : ""}` : "on TCGplayer"}
        </StockPill>
        {!p.openStores && p.storeCount > 0 && <span>no {p.adjective} store we track has it in stock</span>}
        {p.openCount > 1 && (
          <span>
            up to {money(p.highestOpenCents, market)} — you save {money(p.highestOpenCents - bestCents, market)} by buying at the cheapest
          </span>
        )}
      </div>
      {(median != null || msrp != null) && (
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
          {median != null && (
            <div>
              <dt className="inline">Median in-stock price </dt>
              <dd className="tabular inline font-semibold text-ink">
                {money(median, market)} <span className="font-normal text-muted">across {plural(medianStores, "store")}</span>
              </dd>
            </div>
          )}
          {msrp != null && (
            <div>
              <dt className="inline">US MSRP </dt>
              <dd className="tabular inline font-semibold text-ink">
                {money(msrp, market)}
                {vsMsrp != null && vsMsrp !== 0 && (
                  <span className="font-normal text-muted">
                    {" "}
                    · best price {Math.abs(vsMsrp)}% {vsMsrp < 0 ? "below" : "above"} MSRP
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
