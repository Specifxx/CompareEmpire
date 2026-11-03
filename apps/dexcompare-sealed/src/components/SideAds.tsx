"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AFFILIATE_NOTE_SHORT, ebayRetailer, ebayRetailerForHref, ebaySearchUrl, REL_SPONSORED, TCGPLAYER_RETAILER, tcgplayerAffiliateUrl, tcgplayerSearchUrl, type Placement } from "@/lib/affiliate";
import type { TcgplayerTile } from "@/lib/data";
import { formatPrice } from "@/lib/ebay-context";
import { money } from "@/lib/format";
import { thumb } from "@/lib/images";
import type { Region } from "@/lib/regions";
import { useListings } from "./EbayStrip";
import { EbayMark } from "./EbayMark";
import { OutboundLink } from "./OutboundLink";

// The two side rails (owner, 2026-11-03: "a lot of space on the very, very left … and the very, very right … the left side could be
// eBay and the right side TCGplayer … only if you can fit it. If you can't fit it, then don't use the ads"): real sealed eBay listings
// stacked down the far left of a wide screen, the newest sets' TCGplayer products down the far right, both OUTSIDE the page shell
// (max-w-shell, 1480px), fixed beside it under the sticky header.
//
//   • Browser only, wide screens only. Nothing is in the server HTML: the rails mount after hydration and only while the viewport is
//     at least MIN_WIDTH wide, so crawlers, laptops, tablets and phones never see them (no SEO change, no layout change, CLS 0: a
//     fixed element takes no space). The eBay rail asks /api/ebay/<region>?c=sealed only once it is mounted; the TCGplayer tiles are
//     the pre-footer strip's (lib/data.ts tcgplayerTiles), already on the client as its props.
//   • As many tiles as the window's height fits, never a clipped one; a window too short for one tile shows no rail.
//   • Labelled "Ad" with the affiliate note, every link rel sponsored under its own placement (listings-side, tcgplayer-strip-side).
//     Not a pop-up: nothing moves, covers content or asks for anything.

/** The shell is 1480px; each rail is RAIL_W wide with GUTTER on both sides of it. */
const SHELL_W = 1480;
export const RAIL_W = 160;
const GUTTER = 16;
export const MIN_WIDTH = SHELL_W + 2 * (RAIL_W + 2 * GUTTER); // 1864: the RAIL class below says the same
/** Vertical budget: the sticky header (--hdr, 64px from lg) and a gutter above, a gutter below, the rail's own top line and note. */
const TOP = 64 + GUTTER;
const HEAD = 30;
const NOTE = 34;
const PAD = 2 * 8;
const GAP = 8;
/** One tile: 8px padding, a (RAIL_W - 16 - 16)px square picture, two title lines (36px) and a price line (20px). */
export const TILE_H = 8 + (RAIL_W - PAD - 16) + 6 + 36 + 20 + 8;
export const MAX_TILES = 6;

/** How many tiles a window of this height fits (0: no rail). Pure, for the tests. */
export function tilesThatFit(innerHeight: number): number {
  const room = innerHeight - TOP - GUTTER - HEAD - NOTE - PAD;
  return Math.max(0, Math.min(MAX_TILES, Math.floor((room + GAP) / (TILE_H + GAP))));
}

export function SideAds({ region, tiles }: { region: Region; tiles: TcgplayerTile[] }) {
  const [fit, setFit] = useState(0);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
    const update = () => setFit(mq.matches ? tilesThatFit(window.innerHeight) : 0);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  if (fit < 1) return null;
  return (
    <>
      <EbayRail region={region} fit={fit} />
      {tiles.length >= 2 && <TcgRail region={region} tiles={tiles} fit={fit} />}
    </>
  );
}

const RAIL = "fixed z-30 hidden flex-col rounded-xl border border-line bg-surface p-2 shadow-card min-[1864px]:flex";
const TILE = "group flex flex-col rounded-lg border border-line bg-surface p-2 transition-colors hover:border-ink/40";
const EDGE = `calc(50% - ${SHELL_W / 2 + GUTTER + RAIL_W}px)`;
const railStyle = (side: "left" | "right"): CSSProperties => ({ top: `calc(var(--hdr) + ${GUTTER}px)`, width: RAIL_W, ...(side === "left" ? { left: EDGE } : { right: EDGE }) });

function EbayRail({ region, fit }: { region: Region; fit: number }) {
  const placement: Placement = "listings-side";
  const { ref, state } = useListings({ region, context: "sealed", placement, min: 1, eager: true });
  const items = state.status === "ready" ? state.a.items.slice(0, fit) : null;
  if (state.status === "none") return null;
  return (
    <div ref={ref} role="group" data-ad={placement} aria-label="Sponsored: sealed Pokémon on eBay" className={RAIL} style={railStyle("left")}>
      <Head brand={<EbayMark className="text-lg" />} />
      <ul role="list" className="grid gap-2">
        {items
          ? items.map((i) => (
              <li key={i.id}>
                <OutboundLink href={i.href} rel={REL_SPONSORED} retailer={ebayRetailerForHref(i.href, region)} placement={placement} className={TILE} title={`${i.title} · ${formatPrice(i.price)}`}>
                  <span className="relative block aspect-square w-full overflow-hidden rounded-md bg-raised">
                    <img src={i.imageUrl} alt={i.title} width={128} height={128} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-contain" />
                  </span>
                  <span className="mt-1.5 line-clamp-2 h-9 text-xs font-semibold leading-[18px] group-hover:text-brand">{i.title}</span>
                  <span className="tabular block h-5 truncate text-[15px] font-bold leading-5">{formatPrice(i.price)}</span>
                  <span className="sr-only">, on eBay</span>
                </OutboundLink>
              </li>
            ))
          : Array.from({ length: fit }, (_, n) => <li key={n} aria-hidden="true" className="rounded-lg bg-raised" style={{ height: TILE_H }} />)}
      </ul>
      <Note href={ebaySearchUrl("Pokemon sealed", region, placement)} retailer={ebayRetailer(region)} placement={placement} label="All on eBay →" />
    </div>
  );
}

function TcgRail({ region, tiles, fit }: { region: Region; tiles: TcgplayerTile[]; fit: number }) {
  const placement: Placement = "tcgplayer-strip-side";
  const us = region === "us";
  const price = (cents: number) => (us ? money(cents, "US") : `US${money(cents, "US")}`);
  return (
    <div role="group" data-ad={placement} aria-label="Sponsored: Pokémon sealed on TCGplayer" className={RAIL} style={railStyle("right")}>
      <Head
        brand={
          <span className="text-base font-black tracking-tight" aria-label="TCGplayer">
            TCG<span className="text-[#1f6fe5]">player</span>
          </span>
        }
      />
      <ul role="list" className="grid gap-2">
        {tiles.slice(0, fit).map((t) => (
          <li key={t.slug}>
            <OutboundLink href={tcgplayerAffiliateUrl(t.url, region, placement)} rel={REL_SPONSORED} retailer={TCGPLAYER_RETAILER} placement={placement} className={TILE} title={`${t.name} · ${price(t.priceCents)}`}>
              <span className="plate relative block aspect-square w-full overflow-hidden rounded-md">
                <img src={thumb(t.imageUrl, 200) ?? t.imageUrl} alt={t.name} width={128} height={128} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-1 mix-blend-multiply" />
              </span>
              <span className="mt-1.5 line-clamp-2 h-9 text-xs font-semibold leading-[18px] group-hover:text-[#1f6fe5]">{t.name}</span>
              <span className="tabular block h-5 truncate text-[15px] font-bold leading-5">{price(t.priceCents)}</span>
              <span className="sr-only">, on TCGplayer</span>
            </OutboundLink>
          </li>
        ))}
      </ul>
      <Note href={tcgplayerSearchUrl("", region, placement)} retailer={TCGPLAYER_RETAILER} placement={placement} label="All on TCGplayer →" usd={!us} />
    </div>
  );
}

function Head({ brand }: { brand: ReactNode }) {
  return (
    <div className="mb-2 flex h-[22px] items-center justify-between px-1">
      {brand}
      <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Ad</span>
    </div>
  );
}

function Note({ href, retailer, placement, label, usd = false }: { href: string; retailer: string; placement: Placement; label: string; usd?: boolean }) {
  return (
    <p className="mt-2 flex h-[26px] flex-col justify-center px-1 text-[10px] leading-[13px] text-muted">
      <OutboundLink href={href} rel={REL_SPONSORED} retailer={retailer} placement={placement} className="truncate font-bold text-brand">
        {label}
      </OutboundLink>
      <span className="truncate" title={AFFILIATE_NOTE_SHORT}>
        {usd ? "Affiliate links · in US$" : "Affiliate links · we may earn"}
      </span>
    </p>
  );
}
