"use client";

import { useRouter } from "next/navigation";
import { useCart, fmtMoney } from "./MarketplaceCart";

export interface StoreListing {
  listingId: string;
  cardId: string;
  cardName: string;
  collectorNumber: string;
  setName: string | null;
  imageThumbUrl: string | null;
  condition: string;
  isFoil: boolean;
  priceCents: number;
  currency: string;
  country: string;
  shipCents: number | null;
  sellerName: string;
  maxQty: number;
}

export function MarketplaceGrid({ listings }: { listings: StoreListing[] }) {
  const { add } = useCart();
  const router = useRouter();

  const toItem = (l: StoreListing) => ({
    listingId: l.listingId, cardId: l.cardId, cardName: l.cardName, collectorNumber: l.collectorNumber,
    imageThumbUrl: l.imageThumbUrl, condition: l.condition, isFoil: l.isFoil, priceCents: l.priceCents,
    currency: l.currency, country: l.country, shipCents: l.shipCents, sellerName: l.sellerName, maxQty: l.maxQty,
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <div key={l.listingId} className="card-surface flex flex-col overflow-hidden">
          <div className="relative aspect-[3/4] bg-ink-900">
            {l.imageThumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.imageThumbUrl} alt={l.cardName} loading="lazy" className="h-full w-full object-contain" />
            )}
            <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
              {l.condition}{l.isFoil ? " · Foil" : ""}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <div className="truncate text-sm font-semibold text-white">{l.cardName}</div>
            <div className="text-[11px] text-slate-500">{l.setName} · {l.collectorNumber}</div>
            <div className="mt-1 text-lg font-extrabold text-accent">{fmtMoney(l.priceCents, l.currency)}</div>
            <div className="text-[11px] text-slate-500">
              {l.shipCents != null ? `+ ${fmtMoney(l.shipCents, l.currency)} ship` : "shipping at checkout"} · {l.country}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-400">
              <span>✓</span><span className="truncate">{l.sellerName}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => add(toItem(l))} className="btn-ghost flex-1 px-2 py-1.5 text-xs">Add to cart</button>
              <button onClick={() => { add(toItem(l)); router.push("/marketplace/checkout"); }} className="btn-primary flex-1 px-2 py-1.5 text-xs">Buy now</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
