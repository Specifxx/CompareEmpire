import type { OfferView } from "@/lib/data";
import { REL_STORE } from "@/lib/affiliate";
import { money, timeAgo } from "@/lib/format";
import { offerStock, offerStockLabel } from "@/lib/sealed-offers";
import { Ago } from "./Ago";
import { StockPill } from "./StockPill";

export function OfferTable({ offers, market, preorder }: { offers: OfferView[]; market: string; preorder: boolean }) {
  const now = Date.now();
  const cheapestOpen = offers.find((o) => offerStock(o, now) === "open");
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {offers.map((o) => {
          const state = offerStock(o, now);
          const best = o === cheapestOpen;
          return (
            <li key={o.store} className={`flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${best ? "bg-open-soft/40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{o.storeName}</span>
                  {best && <span className="shrink-0 rounded-full bg-open px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surface">Best price</span>}
                </div>
                <div className="mt-0.5 truncate text-xs text-faint" title={o.title}>
                  {o.storeHost} · checked <Ago iso={o.lastSeen} initial={timeAgo(o.lastSeen, now)} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                <StockPill state={state} preorder={preorder}>
                  {offerStockLabel(state, preorder)}
                </StockPill>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`tabular text-right font-display text-lg font-bold sm:w-24 ${state === "open" ? "" : "text-faint line-through decoration-1"}`}>
                    {money(o.priceCents, market)}
                  </div>
                  <a href={o.url} target="_blank" rel={REL_STORE} className={state === "open" ? "btn-primary" : "btn-ghost"}>
                    {state === "open" ? "View deal" : "View"} <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
