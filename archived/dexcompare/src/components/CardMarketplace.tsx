"use client";

import { useEffect, useState } from "react";
import { BuyButton } from "./BuyButton";
import { CardListingForm } from "./CardListingForm";
import { PlaceBuyOrderForm, SellToBidButton } from "./BuyOrderActions";
import { conditionInfo } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { useCountry } from "./CountryProvider";

// The CompareEmpire Marketplace (test-mode, play-money) as a CLIENT island that
// loads its own data from /api/card/[id]/market on mount. It used to be rendered
// server-side, but that read the session cookie (getCurrentUser) — which silently
// voided the card page's `revalidate` and made all ~20k card pages uncacheable
// dynamic SSR, throttling Googlebot's crawl. Moving it here lets /card/[id] be
// genuine ISR. As a bonus it keeps the "test-mode demo using play money"
// boilerplate out of the crawlable HTML (an E-E-A-T win at 20k-page scale) while
// the feature still works for signed-in users.

interface Listing {
  id: string;
  condition: string;
  isFoil: boolean;
  priceCents: number;
  quantity: number;
  currency: string;
  sellerId: string;
  seller: { displayName: string; sellerName: string | null };
}
interface BuyOrder {
  id: string;
  condition: string;
  isFoil: boolean;
  maxPriceCents: number;
  quantity: number;
  quantityFilled: number;
  buyerId: string;
  buyer: { displayName: string };
}
interface MarketData {
  listings: Listing[];
  buyOrders: BuyOrder[];
  viewer: { id: string; verifiedSeller: boolean } | null;
}

export function CardMarketplace({ cardId, marketPriceCents }: { cardId: string; marketPriceCents: number }) {
  const [data, setData] = useState<MarketData | null>(null);
  const { currency } = useCountry();
  const fmt = (cents: number) => formatMoney(cents, currency);

  useEffect(() => {
    let alive = true;
    fetch(`/api/card/${cardId}/market`)
      .then((r) => r.json())
      .then((d: MarketData) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData({ listings: [], buyOrders: [], viewer: null }); });
    return () => { alive = false; };
  }, [cardId]);

  // Nothing until loaded — it's below the fold and non-SEO, so no skeleton needed.
  if (!data) return null;
  const { listings, buyOrders, viewer } = data;

  return (
    <div className="card-surface mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-700 p-4">
        <div>
          <h2 className="font-bold text-white">CompareEmpire Marketplace</h2>
          <p className="mt-0.5 text-xs text-slate-500">Buy directly from collectors · test-mode play money</p>
        </div>
        <span className="chip bg-brand-500/15 text-brand-400"><span className="num">{listings.length}</span> for sale</span>
      </div>

      {/* Asks — listings you can buy now */}
      {listings.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">
          No marketplace listings for this card yet.
          {viewer?.verifiedSeller ? " Be the first to list one below." : " Place a buy order below to signal what you'd pay."}
        </div>
      ) : (
        <ul className="divide-y divide-ink-800">
          {listings.map((l) => {
            const c = conditionInfo(l.condition);
            const own = viewer?.id === l.sellerId;
            const sellerLabel = l.seller.sellerName || l.seller.displayName;
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 hover:bg-ink-900/50 sm:flex-nowrap sm:p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{sellerLabel}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="chip bg-ink-800" style={{ color: c.color }} title={c.full}>{c.label}</span>
                    {l.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦ Foil</span>}
                    {l.quantity > 1 && <span>{l.quantity} available</span>}
                  </div>
                </div>
                <div className="num shrink-0 text-right text-lg font-bold text-accent">{formatMoney(l.priceCents, l.currency)}</div>
                <div className="order-last w-full basis-full sm:order-none sm:w-auto sm:basis-auto">
                  <BuyButton
                    listingId={l.id}
                    canBuy={!!viewer && !own}
                    reason={!viewer ? "Sign in to buy" : own ? "Your listing" : undefined}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sell — verified sellers list a copy of this exact card */}
      {viewer?.verifiedSeller && (
        <div className="border-t border-ink-800 bg-ink-900/40 p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">List your copy for sale</h3>
          <CardListingForm cardId={cardId} marketPriceCents={marketPriceCents} />
        </div>
      )}

      {/* Bids — open buy orders, plus the place-a-buy-order CTA */}
      <div className="border-t border-ink-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Buy orders (bids) <span className="num text-slate-500">({buyOrders.length})</span>
        </h3>
        {buyOrders.length > 0 && (
          <ul className="mb-3 divide-y divide-ink-800 rounded-lg border border-ink-800">
            {buyOrders.map((b) => {
              const own = viewer?.id === b.buyerId;
              const remaining = b.quantity - b.quantityFilled;
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{b.buyer.displayName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="chip bg-ink-800 text-slate-300">{b.condition === "ANY" ? "Any condition" : b.condition}</span>
                      {b.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦ Foil</span>}
                      {remaining > 1 && <span>wants {remaining}</span>}
                    </div>
                  </div>
                  <div className="num shrink-0 text-right text-base font-bold text-white">{fmt(b.maxPriceCents)}</div>
                  <div className="order-last w-full basis-full sm:order-none sm:w-auto sm:basis-auto">
                    <SellToBidButton
                      buyOrderId={b.id}
                      canSell={!!viewer && !own}
                      reason={!viewer ? "Sign in" : own ? "Your bid" : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <PlaceBuyOrderForm cardId={cardId} marketPriceCents={marketPriceCents} signedIn={!!viewer} />
      </div>

      <p className="border-t border-ink-800 p-3 text-center text-[11px] text-slate-600">
        The CompareEmpire Marketplace is a test-mode demo using play money — no real payments are processed.
      </p>
    </div>
  );
}
