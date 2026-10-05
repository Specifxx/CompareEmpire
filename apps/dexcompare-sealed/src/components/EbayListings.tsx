"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Placement } from "@/lib/affiliate";
import { acceptResponse, isContextString, listingsUrl, MAX_DISPLAY_AGE_MS, requestContext } from "@/lib/ebay-context";
import { isRegion, type Region } from "@/lib/regions";
import { Disclosure, ListingTile, SeeMore, SeeMorePlaceholder, SkeletonTile, TileItem, TileRow, UnitHeader, type Variant } from "./ListingsParts";

// The eBay listings strips: real listings from eBay's Browse API, fetched from the browser.
//
//   • A page NEVER calls eBay while it renders (pages stay ISR). Until the data is known a strip
//     renders its FALLBACK (the native banner, or the chase search tiles: what a crawler or a
//     visitor without script sees) on top of an invisible, listings-sized box that reserves the
//     unit's height; only when it scrolls within ~300px of the viewport does it fetch
//     /api/ebay/<region>?c=<context> (src/app/api/ebay/[region]/route.ts). Off-screen units
//     fetch nothing. With no keys / kill switch (`enabled` false) it renders its fallback on
//     the server and never fetches at all.
//   • Listings replace the reserved box at the same height (fixed tile heights): CLS 0. When there
//     are NO listings (empty, error, 403 before Buy API access is granted) the unit collapses to the
//     fallback's own height rather than leaving a gap around it, but only once it is entirely out of
//     the viewport (below it, where nothing visible moves, or above it, where scroll anchoring keeps
//     the page still): a collapse in view would shift the content under it. A unit that stays in
//     view (a short page) keeps its fallback at the top of the reserved box.
//   • The response is re-validated here (ebay-context.ts acceptResponse): https, eBay image
//     host, our campaign id, whitelisted fields only. A bad or empty one shows the fallback.
//   • Every tile is one plain <a> through OutboundLink: rel="sponsored nofollow noopener
//     noreferrer", one buy_click { retailer, placement } per click, customid
//     dex-<region>-<placement>. Thumbnails are plain <img>, lazy, no-referrer.
//   • Labelled "Ad" with the disclosure and "Listings from eBay, refreshed about hourly".
//   • Fallback: the native banner (or, on the home and landing pages, the chase-card search
//     tiles), passed in as a server-rendered node.

// ─── Fetching: one request per region+context, shared by every unit that wants it ──────

const CLIENT_TTL_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 8000;
const REFRESH_AFTER_MS = 2 * 3600_000;
const AGE_CHECK_MS = 5 * 60_000;

interface Pending {
  promise: Promise<unknown>;
  at: number;
  users: number;
  ac: AbortController;
  done: boolean;
}
const requests = new Map<string, Pending>();

function acquire(region: Region, context: string, force = false): Pending {
  const key = `${region}|${requestContext(context)}`;
  const hit = requests.get(key);
  if (hit && !force && Date.now() - hit.at < CLIENT_TTL_MS) {
    hit.users++;
    return hit;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  const entry: Pending = { promise: Promise.resolve(null), at: Date.now(), users: 1, ac, done: false };
  entry.promise = fetch(listingsUrl(region, requestContext(context)), { signal: ac.signal, headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((body) => {
      entry.done = true;
      // A failure is not remembered: the next unit to ask tries again.
      if (!body && requests.get(key) === entry) requests.delete(key);
      return body;
    })
    .finally(() => clearTimeout(timer));
  requests.set(key, entry);
  return entry;
}

/** A unit stops waiting: with nobody left, an unfinished request is aborted. (By entry, not key: a newer request under the same key is not touched.) */
function release(entry: Pending) {
  entry.users = Math.max(0, entry.users - 1);
  if (entry.users === 0 && !entry.done) {
    entry.ac.abort();
    for (const [k, v] of requests) if (v === entry) requests.delete(k);
  }
}

type Accepted = ReturnType<typeof acceptResponse>;
type State = { status: "idle" } | { status: "ready"; items: Accepted["items"]; asOf: string } | { status: "fallback" };

/**
 * Observe `ref`; the first time it comes within 300px of the viewport (or at once where
 * IntersectionObserver is missing), load the context. Returns the unit's state.
 */
function useListings(opts: { enabled: boolean; region: Region; context: string; placement: Placement; min: number }): { ref: React.RefObject<HTMLDivElement>; state: State } {
  const { enabled, region, context, placement, min } = opts;
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const [round, setRound] = useState(0); // bumped to re-fetch after a long-open tab returns

  useEffect(() => {
    if (!enabled || !isRegion(region) || !isContextString(context)) return;
    const node = ref.current;
    let held: Pending | null = null;
    let cancelled = false;
    const load = (force: boolean) => {
      held = acquire(region, context, force);
      held.promise.then((body) => {
        if (cancelled) return;
        const r = acceptResponse(body, region, placement);
        setState(r.items.length >= min ? { status: "ready", items: r.items, asOf: r.asOf } : { status: "fallback" });
      });
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "undefined" || !node) {
      load(round > 0);
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            load(round > 0);
          }
        },
        { rootMargin: "300px 0px" },
      );
      io.observe(node);
    }
    return () => {
      cancelled = true;
      io?.disconnect();
      if (held) release(held);
    };
  }, [enabled, region, context, placement, min, round]);

  // A tab left open for hours. The unit tells the visitor the data is up to 3 hours older than eBay's, so keep that true
  // (licence 8.1(c) allows 6): once the listings are 2 hours old fetch again (at most every 10 minutes); at 3 hours drop them
  // for the fallback. Checked on a timer and when the tab comes back.
  const asOf = state.status === "ready" ? state.asOf : null;
  useEffect(() => {
    if (!asOf) return;
    const born = Date.parse(asOf);
    let lastTry = 0;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const age = Date.now() - born;
      if (age > MAX_DISPLAY_AGE_MS) setState({ status: "fallback" });
      if (age > REFRESH_AFTER_MS && Date.now() - lastTry > 10 * 60_000) {
        lastTry = Date.now();
        setRound((n) => n + 1);
      }
    };
    const id = setInterval(check, AGE_CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [asOf]);

  return { ref, state };
}

/**
 * `none` (there are no listings to show): true once the unit is entirely outside the viewport, which is when it is safe
 * to drop its reserved height (see the header). Without IntersectionObserver, at once.
 */
function useCollapsed(ref: React.RefObject<HTMLDivElement>, none: boolean): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!none || collapsed) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setCollapsed(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.every((e) => !e.isIntersecting)) setCollapsed(true);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [ref, none, collapsed]);
  return collapsed;
}

// ─── The strip ─────────────────────────────────────────────────────────────────

const SHOWN: Record<Variant, { count: number; min: number }> = {
  hero: { count: 8, min: 4 },
  section: { count: 6, min: 3 },
  slim: { count: 4, min: 3 },
};

export interface EbayListingsStripProps {
  /** From the server (lib/ebay-listings.ts ebayListingsEnabled): false renders `fallback` and fetches nothing. */
  enabled: boolean;
  region: Region;
  /** A context string from lib/ebay-context.ts ("home", "set:<slug>", "product:<code>"…). */
  context: string;
  variant: Variant;
  placement: Placement;
  /** What is shown while there are no listings: the native banner, or the chase search tiles. Server-rendered. */
  fallback?: ReactNode;
  /** The heading ("Chase cards on eBay" / "Chase cards from <set> on eBay"). ListingsStrip resolves it on the server from the context. */
  heading?: string;
  /** What "See more on eBay" searches for; default "special illustration rare". */
  searchQuery?: string;
  /** Which eBay: default "eBay" ("eBay Australia" for NZ and "eBay US" for SG, whose visitors are sent to those sites); the landing page's "eBay US". */
  site?: string;
  /** Take these items of the response (slim strips on a home page skip the ones the hero shows). */
  slice?: [number, number];
  className?: string;
}

const SITE_NAME: Partial<Record<Region, string>> = { nz: "eBay Australia", sg: "eBay US" };

export function EbayListingsStrip({ enabled, region, context, variant, placement, fallback = null, heading = "Chase cards on eBay", searchQuery = "special illustration rare", site, slice, className = "" }: EbayListingsStripProps) {
  const valid = isContextString(context);
  const { count, min } = SHOWN[variant];
  const [start, end] = slice ?? [0, count];
  const { ref, state } = useListings({ enabled: enabled && valid, region, context, placement, min });
  const items = state.status === "ready" ? state.items.slice(start, end) : null;
  const none = state.status === "fallback" || (!!items && items.length < min);
  const collapsed = useCollapsed(ref, none);
  // Switched off: the fallback, on the server, in the same wrapper (so its margin is the unit's) and with no reserved height.
  if (!enabled || !valid) return fallback ? <div className={className}>{fallback}</div> : null;

  const title = heading;
  const query = searchQuery;
  const siteName = site ?? SITE_NAME[region] ?? "eBay";
  const label = `${title} (ads)`;

  const body = (action: ReactNode, shown: typeof items) => (
    <>
      <UnitHeader heading={title} site={siteName} variant={variant} action={action} />
      <TileRow variant={variant} label={label}>
        {shown
          ? shown.map((it) => (
              <TileItem key={it.id} variant={variant}>
                <ListingTile item={it} href={it.href} variant={variant} region={region} placement={placement} />
              </TileItem>
            ))
          : Array.from({ length: count }, (_, i) => (
              <TileItem key={i} variant={variant}>
                <SkeletonTile variant={variant} />
              </TileItem>
            ))}
      </TileRow>
      <Disclosure />
    </>
  );

  // No listings (empty, error, too few, too old) and the unit is out of the viewport: just the fallback, at its own height.
  if (none && collapsed) return fallback ? <div className={className}>{fallback}</div> : null;
  // Not known yet (before the fetch, while it runs, and in the server-rendered page), or none and still in view: the fallback on
  // top of an invisible, listings-sized box. The fallback is what a crawler or a visitor without script sees; the box keeps the
  // unit's height, so listings replace it without moving the page. (Stacked in one grid cell: the taller of the two sets the
  // height; the column is minmax(0,1fr) so the scrolling tile row cannot widen it.)
  if (!items || none) {
    return (
      <div ref={ref} className={`grid grid-cols-[minmax(0,1fr)] ${className}`}>
        <div aria-hidden="true" className="ad-box invisible col-start-1 row-start-1 p-3 sm:p-4">
          {body(<SeeMorePlaceholder />, null)}
        </div>
        <div className="col-start-1 row-start-1 self-start">{fallback}</div>
      </div>
    );
  }
  return (
    <div ref={ref} data-ad={placement} data-state={state.status} role="group" aria-label={`Sponsored: ${label}`} className={`ad-box p-3 sm:p-4 ${className}`}>
      {body(<SeeMore region={region} query={query} placement={placement} />, items)}
    </div>
  );
}

// ─── Above the footer ──────────────────────────────────────────────────────────

/**
 * The slim strip above every content page's footer. The generic feed (the home context),
 * four tiles. On a region's home page the hero already shows the first eight, so this one
 * takes the last four of the twelve; elsewhere the first four.
 */
export function PreFooterListings({ enabled, region, fallback }: { enabled: boolean; region: Region; fallback: ReactNode }) {
  const path = usePathname() || "";
  const onHome = path === `/${region}` || path === `/${region}/`;
  return <EbayListingsStrip enabled={enabled} region={region} context="home" variant="slim" placement="listings-footer" fallback={fallback} slice={onHome ? [8, 12] : [0, 4]} />;
}

// ─── The 2x-wide in-feed tile (browse grid, desktop) ────────────────────────────

/**
 * In /[region]/sealed's grid, the first in-feed position, from lg (4 columns, where the
 * position starts a row, so two columns always fit): a double-width tile with two listings
 * stacked, each a thumbnail beside its title and price. Where listings are missing it is a
 * double-width native search tile, so the grid never reflows. Below lg the page keeps the
 * single native tile (ProductGrid renders both and CSS picks).
 */
export function EbayListingsFeedTile({ enabled, region, native }: { enabled: boolean; region: Region; native: ReactNode }) {
  const placement: Placement = "listings-browse";
  const { ref, state } = useListings({ enabled, region, context: "home", placement, min: 2 });
  const items = state.status === "ready" ? state.items.slice(0, 2) : null;
  if (!enabled || state.status === "fallback" || (items && items.length < 2)) return <>{native}</>;
  return (
    <div ref={ref} data-ad={placement} data-state={state.status} role="group" aria-label="Sponsored: Chase cards on eBay (ads)" className="ad-box flex h-full min-h-[24rem] flex-col p-4">
      <UnitHeader heading="Chase cards on eBay" variant="section" action={<SeeMore region={region} query="special illustration rare" placement={placement} />} />
      <ul role="list" aria-label="Chase cards on eBay (ads)" className="mt-3 grid flex-1 grid-rows-2 gap-3">
        {(items ?? [null, null]).map((it, i) => (
          <li key={it?.id ?? i} className="min-h-0">
            {it ? <ListingTile item={it} href={it.href} variant="feed" region={region} placement={placement} /> : <SkeletonTile variant="feed" />}
          </li>
        ))}
      </ul>
      <Disclosure />
    </div>
  );
}
