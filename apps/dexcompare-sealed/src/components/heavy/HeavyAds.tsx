"use client";
// The heavy set of the ad-intensity test (lib/ad-heavy.ts has the rules): the banner pair again at the top of a region page, the
// TCGplayer "Recommended for you" pop-up and the TCGplayer slide-in card. Browser only: nothing here is in the server HTML (the top
// banners hold their height there, as the bottom pair does). Labelled "Ad", rel sponsored, each under its own placement.
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@vercel/analytics";
import { REL_SPONSORED, TCGPLAYER_RETAILER, tcgplayerAffiliateUrl, tcgplayerSearchUrl, type Placement } from "@/lib/affiliate";
import { AD_HEAVY, MAX_SLIDES, SLIDE_AFTER_S, countView, heavyBlocked, notePopup, noteSlide, popupDue, popupsShown, slidesShown } from "@/lib/ad-heavy";
import type { TcgplayerTile } from "@/lib/data";
import { money } from "@/lib/format";
import { thumb } from "@/lib/images";
import type { Region } from "@/lib/regions";
import { InlineAds } from "../InlineAds";
import { OutboundLink } from "../OutboundLink";

const POPUP: Placement = "heavy-popup";
const SLIDE: Placement = "heavy-slidein";

function usd(region: Region, cents: number): string {
  return region === "us" ? money(cents, "US") : `US${money(cents, "US")}`;
}

/** The banner pair at the TOP of a region page (above the page's own content), under its own placements. */
export function HeavyTopAds({ region, tiles }: { region: Region; tiles: TcgplayerTile[] }) {
  const path = usePathname() || "";
  if (!AD_HEAVY) return null;
  return (
    <div className="page" data-heavy-top>
      <InlineAds key={`top|${region}|${path}`} region={region} tiles={tiles.slice(6).concat(tiles.slice(0, 6))} className="mb-6 mt-4" ebayPlacement="heavy-top-ebay" tcgPlacement="heavy-top-tcg" />
    </div>
  );
}

function Pick({ t, region, placement, big = false }: { t: TcgplayerTile; region: Region; placement: Placement; big?: boolean }) {
  return (
    <OutboundLink
      href={tcgplayerAffiliateUrl(t.url, region, placement)}
      rel={REL_SPONSORED}
      retailer={TCGPLAYER_RETAILER}
      placement={placement}
      title={`${t.name} · ${usd(region, t.priceCents)}`}
      className={`group flex flex-col rounded-xl border border-line bg-surface p-2 transition-colors hover:border-[#1f6fe5] ${big ? "" : "w-[112px] shrink-0"}`}
    >
      <span className="plate relative block aspect-square w-full overflow-hidden rounded-lg">
        <img src={thumb(t.imageUrl, 400) ?? t.imageUrl} alt={t.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-contain p-1" />
      </span>
      <span className="mt-1.5 line-clamp-2 h-8 text-[11px] font-semibold leading-4">{t.name}</span>
      <span className="tabular mt-1 text-sm font-bold">{usd(region, t.priceCents)}</span>
      <span className="btn-tcg mt-1.5 justify-center px-2 py-1 text-[11px]">View deal</span>
    </OutboundLink>
  );
}

/** The pop-up and the slide-in, mounted once in the region layout. */
export function HeavyPopups({ region, tiles }: { region: Region; tiles: TcgplayerTile[] }) {
  const path = usePathname() || "";
  const [popup, setPopup] = useState(false);
  const [slide, setSlide] = useState(false);
  const picks = tiles.filter((t) => t.imageUrl).slice(0, 6);

  useEffect(() => {
    if (!AD_HEAVY || picks.length < 3 || heavyBlocked()) return;
    const view = countView();
    setSlide(false);
    let t1: number | undefined;
    let t2: number | undefined;
    if (popupDue(view, popupsShown())) {
      // A beat after the page draws, so the visitor sees where they are first.
      t1 = window.setTimeout(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        notePopup();
        setPopup(true);
        track("heavy_ad", { kind: "popup", view });
      }, 1500);
    } else if (slidesShown() < MAX_SLIDES) {
      t2 = window.setTimeout(() => {
        noteSlide();
        setSlide(true);
        track("heavy_ad", { kind: "slidein", view });
      }, SLIDE_AFTER_S * 1000);
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // One count per page: the path is the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const close = useCallback(() => setPopup(false), []);
  useEffect(() => {
    if (!popup) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [popup, close]);

  if (!AD_HEAVY) return null;
  return (
    <>
      {popup && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Recommended for you" data-heavy-popup>
          <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 shadow-lift sm:rounded-2xl sm:p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="ad-pill">Ad</span>
                  <span className="text-lg font-black leading-none tracking-tight" aria-label="TCGplayer">
                    TCG<span className="text-[#1f6fe5]">player</span>
                  </span>
                </p>
                <h2 className="mt-1.5 font-display text-xl font-bold leading-tight text-ink">Recommended for you</h2>
                <p className="mt-0.5 text-sm text-muted">Sealed Pokémon in stock on TCGplayer today{region === "us" ? "" : " · prices in US$"}.</p>
              </div>
              <button type="button" onClick={close} autoFocus aria-label="Close" className="-mr-1 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {picks.map((t) => (
                <Pick key={t.slug} t={t} region={region} placement={POPUP} big />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <OutboundLink href={tcgplayerSearchUrl("", region, POPUP)} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement={POPUP} className="btn-tcg px-4 py-2 text-sm">
                Shop all on TCGplayer →
              </OutboundLink>
              <button type="button" onClick={close} className="text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
                No thanks, continue to the site
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-tight text-muted">Paid link: DexCompare may earn a commission from TCGplayer purchases, at no cost to you.</p>
          </div>
        </div>
      )}
      {slide && !popup && (
        <aside aria-label="Sponsored: recommended on TCGplayer" data-heavy-slide className="fixed bottom-20 right-3 z-40 w-[min(380px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-3 shadow-lift sm:bottom-4">
          <div className="flex items-center gap-2">
            <span className="ad-pill">Ad</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">Recommended on TCGplayer</span>
            <button type="button" onClick={() => setSlide(false)} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="scroller mt-2 gap-2">
            {picks.slice(0, 4).map((t) => (
              <Pick key={t.slug} t={t} region={region} placement={SLIDE} />
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
