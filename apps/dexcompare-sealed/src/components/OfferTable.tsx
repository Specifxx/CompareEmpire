import Link from "next/link";
import type { OfferView } from "@/lib/data";
import { offerLink, offerRetailer } from "@/lib/affiliate";
import { ebayRowNote, type PriceFloor } from "@/lib/ebay-offer-row";
import { money, timeAgo } from "@/lib/format";
import { perPackCents } from "@/lib/packs";
import { REGIONS, type Region } from "@/lib/regions";
import { offerStock, offerStockLabel } from "@/lib/sealed-offers";
import { Ago } from "./Ago";
import { OfferRowsWithEbay, type OfferRowSlot } from "./EbayStrip";
import { OutboundLink } from "./OutboundLink";
import { StockPill } from "./StockPill";

// The region's offers, ranked (in the US that includes TCGplayer's, badged as a marketplace), and, with `ebay`, ONE eBay row among
// them: the product's lowest-priced own eBay listing, ranked by its price among the stores you can buy from now, tinted, labelled "Ad",
// with eBay's blue button (EbayStrip.tsx OfferRowsWithEbay, lib/ebay-offer-row.ts). The owner's call: DexCompare compares websites, and
// eBay is one. When the eBay listing is cheaper than every store you can buy from it is the best price ("Best price" on it, "Best store
// price" on the cheapest store, and the product page's best-price card shows it: BestPriceCard.tsx); nothing counts it (the title's store
// count, the median).
// The store rows are rendered here, on the server; the browser only places the eBay row among them.
export function OfferTable({
  offers,
  region,
  preorder,
  packs = null,
  ebay = null,
}: {
  offers: OfferView[];
  region: Region;
  preorder: boolean;
  /** Booster packs per unit (src/lib/packs.ts), for a per-pack price under each row's price. Null = not shown. */
  packs?: number | null;
  /** The product's eBay row: its slug (its own listings), the eBay search used when it has none, the store-price floor and the pack count
   *  listings are checked against (lib/ebay-offer-row.ts rowPacks). Null = no eBay row. */
  ebay?: { slug: string; query: string; floor: PriceFloor | null; packs: number | null } | null;
}) {
  const r = REGIONS[region];
  const now = Date.now();
  const cheapestOpen = offers.find((o) => offerStock(o, now) === "open");
  const rows: OfferRowSlot[] = offers.map((o) => {
    const state = offerStock(o, now);
    const best = o === cheapestOpen;
    const link = offerLink(o.store, o.url, region, "product-table");
    return {
      key: o.store,
      cents: o.priceCents,
      open: state === "open",
      node: (
        <li key={o.store} data-offer-row="" className={`flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${best ? "bg-open-soft/40" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{o.storeName}</span>
              {o.marketplace && (
                <span className="shrink-0 rounded-full border border-line bg-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Marketplace</span>
              )}
              {best && (
                <span className="shrink-0 rounded-full bg-open px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surface">
                  Best <span className="hidden group-data-[ebay=cheaper]/offers:inline">store </span>
                  price
                </span>
              )}
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
                <div className={`tabular font-display text-lg font-bold ${state === "open" ? "" : "text-faint line-through decoration-1"}`}>{money(o.priceCents, r.market)}</div>
                {packs != null && state === "open" && <div className="tabular text-xs text-muted">≈ {money(perPackCents(o.priceCents, packs), r.market)} / pack</div>}
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
      ),
    };
  });
  return (
    <div className="card overflow-hidden">
      {ebay ? (
        <OfferRowsWithEbay rows={rows} region={region} slug={ebay.slug} query={ebay.query} floor={ebay.floor} packs={ebay.packs} allowBest={!preorder} />
      ) : (
        <ul className="divide-y divide-line">{rows.map((row) => row.node)}</ul>
      )}
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted sm:px-5">
        In stock first, then cheapest first. No store pays to be listed or to rank higher —{" "}
        <Link href="/about" prefetch={false} className="underline underline-offset-2 hover:text-ink">
          how DexCompare works
        </Link>
        .{ebay && ebayRowNote(region)}
      </p>
    </div>
  );
}
