"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SealedGroup } from "@/lib/sealed-import";
import { OutboundLink } from "./OutboundLink";
import { useCountry } from "./CountryProvider";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { formatMoney, timeAgo } from "@/lib/format";

// Quick-view popup for sealed products — the sealed twin of QuickView.tsx (cards).
// Clicking a SealedTile opens this instead of navigating to /sealed/<slug>, so the
// price board appears instantly with no page load. Everything it shows is already
// on the SealedGroup the tile holds, so — unlike the card modal — it needs NO
// network fetch: the listings render straight from props.
type OpenArg = { group: SealedGroup; currency: string };

const Ctx = createContext<{ open: (group: SealedGroup, currency: string) => void }>({ open: () => {} });
export const useSealedQuickView = () => useContext(Ctx);

export function SealedQuickViewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OpenArg | null>(null);
  const pushedRef = useRef(false);

  // Mirror the card modal: give the popup a shareable address (/sealed/<slug>) via
  // history (no navigation = no load), so Back closes it and the URL still resolves
  // to the full server-rendered page if copied or reloaded.
  const open = useCallback((group: SealedGroup, currency: string) => {
    setState({ group, currency });
    const url = `/sealed/${group.slug}`;
    if (typeof window !== "undefined" && window.location.pathname !== url) {
      window.history.pushState({ sealedQuickView: true }, "", url);
      pushedRef.current = true;
    }
  }, []);

  const close = useCallback(() => {
    setState(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      pushedRef.current = false;
      setState(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state && <SealedQuickViewModal group={state.group} currency={state.currency} onClose={close} />}
    </Ctx.Provider>
  );
}

function SealedQuickViewModal({ group, currency, onClose }: { group: SealedGroup; currency: string; onClose: () => void }) {
  const { country } = useCountry();
  const href = `/sealed/${group.slug}`;
  const fmt = (cents: number) => formatMoney(cents, currency);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const listings = group.listings;
  const inStock = listings.filter((l) => l.inStock);
  const lowest = group.lowestPriceCents;
  const hasEbay = listings.some((l) => l.retailer === "ebay");
  const ebayHref = ebaySearchUrl(group.name, country);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-ink-950/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <div className="max-h-[88vh] overflow-y-auto">
          {/* Header: image + identity + cheapest price */}
          <div className="flex gap-4 border-b border-ink-800 p-5">
            <div className="grid aspect-square w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-800 bg-ink-950 p-2 sm:w-32">
              {group.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={group.imageUrl} alt={group.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="px-1 text-center text-xs font-bold text-slate-600">{group.productType}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip bg-brand-500/15 text-brand-300">{group.productType}</span>
                {group.setName && <span className="chip bg-ink-800 text-slate-300">{group.setName}</span>}
              </div>
              <h2 className="mt-1.5 text-lg font-extrabold leading-tight text-white">{group.name}</h2>
              <div className="mt-2">
                {lowest != null ? (
                  <>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Cheapest price</div>
                    <div className="num text-2xl font-extrabold text-accent">{fmt(lowest)}</div>
                  </>
                ) : (
                  <div className="text-lg font-extrabold text-down">Sold out</div>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {group.totalCount} {group.totalCount === 1 ? "store" : "stores"} tracked
                {group.storeCount > 0 ? ` · ${group.storeCount} in stock` : ""}
              </p>
            </div>
          </div>

          {/* Price comparison — every tracked store, cheapest in-stock first */}
          <div className="p-4">
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Price comparison</div>
            {listings.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                <p>No store is listing this right now.</p>
                <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="btn-primary mt-3 inline-flex text-xs">
                  Search on eBay{country === "NZ" ? " AU" : ""} →
                </OutboundLink>
              </div>
            ) : (
              <ul className="divide-y divide-ink-800">
                {!hasEbay && (
                  <li className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">
                        eBay{country === "NZ" ? " AU" : ""} <span className="font-normal text-slate-500">(price not available)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Marketplace · search live listings</div>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-500">—</div>
                    <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="btn-primary px-3 py-1.5 text-xs">
                      Search →
                    </OutboundLink>
                  </li>
                )}
                {listings.map((l, i) => (
                  <li key={i} className={`flex items-center gap-3 py-2.5 ${l.inStock ? "" : "opacity-55"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{l.retailerName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        {l.inStock ? <span className="text-brand-400">● In stock</span> : <span>● Out of stock</span>}
                        <span>· seen {timeAgo(l.lastSeen)}</span>
                      </div>
                    </div>
                    <div className={`num text-right text-sm font-bold ${l.inStock ? "text-accent" : "text-slate-400 line-through"}`}>
                      {fmt(l.priceCents)}
                    </div>
                    <OutboundLink
                      href={affiliateUrl(l.url, l.retailer)}
                      retailer={l.retailer}
                      country={country}
                      kind="sealed"
                      className={`px-3 py-1.5 text-xs ${l.inStock ? "btn-primary" : "btn-ghost"}`}
                    >
                      {l.inStock ? "Buy →" : "Check →"}
                    </OutboundLink>
                  </li>
                ))}
              </ul>
            )}

            {hasEbay && (
              <p className="mt-2 border-t border-ink-800 pt-2 text-right text-[11px]">
                <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="font-semibold text-brand-400 hover:underline">
                  Search eBay{country === "NZ" ? " AU" : ""} for more listings →
                </OutboundLink>
              </p>
            )}

            <a href={href} className="btn-ghost mt-3 flex w-full justify-center text-sm">
              View full page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
