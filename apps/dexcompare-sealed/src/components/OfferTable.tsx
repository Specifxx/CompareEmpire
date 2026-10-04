import Link from "next/link";
import type { OfferView } from "@/lib/data";
import { ebayLabel, ebayRetailer, ebaySearchUrl, offerLink, offerRetailer, REL_SPONSORED, TCGPLAYER_KEY, TCGPLAYER_RETAILER, tcgplayerSearchUrl } from "@/lib/affiliate";
import { money, timeAgo } from "@/lib/format";
import { perPackCents } from "@/lib/packs";
import { REGIONS, type Region } from "@/lib/regions";
import { offerStock, offerStockLabel } from "@/lib/sealed-offers";
import { Ago } from "./Ago";
import { AdPill } from "./Ebay";
import { AFFILIATE_NOTE, ebayQuery } from "./Marketplaces";
import { OutboundLink } from "./OutboundLink";
import { StockPill } from "./StockPill";

// The region's offers, ranked (in the US that includes TCGplayer's, badged as a
// marketplace), then a separate, unranked "Marketplaces" group of searches.
export function OfferTable({
  offers,
  region,
  preorder,
  productName,
  usTcgplayer = null,
  packs = null,
  marketGroup = true,
}: {
  offers: OfferView[];
  region: Region;
  preorder: boolean;
  productName: string;
  /** Outside the US: the matched TCGplayer product, linked (never priced) in the marketplace group. */
  usTcgplayer?: { url: string; title: string } | null;
  /** Booster packs per unit (src/lib/packs.ts), for a per-pack price under each row's price. Null = not shown. */
  packs?: number | null;
  /**
   * The Marketplaces group closing the table. The marketplace panel under the
   * best price already has the same links, so a short table drops this group
   * (lib/ebay-ads.ts productAdPlan): two eBay units must not share a phone screen.
   */
  marketGroup?: boolean;
}) {
  const r = REGIONS[region];
  const us = r.market === "US";
  const now = Date.now();
  const cheapestOpen = offers.find((o) => offerStock(o, now) === "open");
  const ranked = offers.find((o) => o.marketplace);
  const tcg = usTcgplayer
    ? offerLink(TCGPLAYER_KEY, usTcgplayer.url, region, "product-table")
    : { href: tcgplayerSearchUrl(productName, region, "product-table"), rel: REL_SPONSORED };
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {offers.map((o) => {
          const state = offerStock(o, now);
          const best = o === cheapestOpen;
          const link = offerLink(o.store, o.url, region, "product-table");
          return (
            <li key={o.store} data-offer-row="" className={`flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${best ? "bg-open-soft/40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{o.storeName}</span>
                  {o.marketplace && (
                    <span className="shrink-0 rounded-full border border-line bg-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Marketplace</span>
                  )}
                  {best && <span className="shrink-0 rounded-full bg-open px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surface">Best price</span>}
                </div>
                <div className="mt-0.5 truncate text-xs text-faint" title={o.title}>
                  {o.storeHost} · checked <Ago iso={o.lastSeen} initial={timeAgo(o.lastSeen, now)} />
                  {link.sponsored && <span className="text-muted"> · affiliate link</span>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                <StockPill state={state} preorder={preorder}>
                  {offerStockLabel(state, preorder)}
                </StockPill>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-right sm:w-28">
                    <div className={`tabular font-display text-lg font-bold ${state === "open" ? "" : "text-faint line-through decoration-1"}`}>
                      {money(o.priceCents, r.market)}
                    </div>
                    {packs != null && state === "open" && (
                      <div className="tabular text-xs text-muted">≈ {money(perPackCents(o.priceCents, packs), r.market)} / pack</div>
                    )}
                  </div>
                  <OutboundLink
                    href={link.href}
                    rel={link.rel}
                    retailer={offerRetailer(o.store, o.storeName, r.market)}
                    placement="product-table"
                    className={state === "open" ? "btn-primary" : "btn-ghost"}
                  >
                    {state === "open" ? "View deal" : "View"} <span aria-hidden="true">↗</span>
                  </OutboundLink>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted sm:px-5">
        In stock first, then cheapest first. No store pays to be listed or to rank higher —{" "}
        <Link href="/about" prefetch={false} className="underline underline-offset-2 hover:text-ink">
          how DexCompare works
        </Link>
        .
      </p>
      {marketGroup && (
        <div data-ad="product-after-table">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-4 border-line bg-raised px-4 py-2.5 sm:px-5">
            <h3 className="eyebrow">Marketplaces</h3>
            <span className="text-xs text-muted">{AFFILIATE_NOTE}</span>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {/* "Still deciding?": the eBay row of this group, a labelled mini banner. */}
            <li className="flex flex-col gap-3 bg-ad px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AdPill />
                  <span className="font-semibold">Still deciding? Search this product on eBay</span>
                </div>
                <div className="mt-0.5 text-xs text-muted">Buy It Now listings on {ebayLabel(region)}</div>
              </div>
              <OutboundLink
                href={ebaySearchUrl(ebayQuery(productName, ranked ?? usTcgplayer), region, "product-after-table")}
                rel={REL_SPONSORED}
                retailer={ebayRetailer(region)}
                placement="product-after-table"
                className="btn-ad shrink-0 self-start sm:self-center"
              >
                Search eBay <span aria-hidden="true">↗</span>
              </OutboundLink>
            </li>
            {!ranked && (
              <MarketRow
                name="TCGplayer"
                detail={us ? "Pokémon sealed listings from TCGplayer sellers" : "US marketplace · prices in US$, not compared here"}
                action={usTcgplayer ? "View" : "Search TCGplayer"}
                href={tcg.href}
                rel={tcg.rel}
                retailer={TCGPLAYER_RETAILER}
              />
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function MarketRow({ name, detail, action, href, rel, retailer }: { name: string; detail: string; action: string; href: string; rel: string; retailer: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <div className="font-semibold">{name}</div>
        <div className="mt-0.5 text-xs text-faint">{detail}</div>
      </div>
      <OutboundLink href={href} rel={rel} retailer={retailer} placement="product-table" className="btn-ghost shrink-0">
        {action} <span aria-hidden="true">↗</span>
      </OutboundLink>
    </li>
  );
}
