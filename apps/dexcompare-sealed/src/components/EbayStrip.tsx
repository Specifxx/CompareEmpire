"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AFFILIATE_NOTE_SHORT, ebayCardSearchUrl, ebayLabel, ebayRetailer, ebayRetailerForHref, ebaySearchUrl, REL_SPONSORED, type Placement } from "@/lib/affiliate";
import {
  acceptResponse,
  conditionLabel,
  DEFAULT_MAX_AGE_HOURS,
  formatAge,
  formatPrice,
  hoursToMs,
  importCadence,
  isContextString,
  isFresh,
  listingsUrl,
  shipLabel,
  type Accepted,
  type AcceptedItem,
  type FeedKind,
} from "@/lib/ebay-context";
import { preFooterPlan } from "@/lib/ebay-ads";
import { isRegion, type Region } from "@/lib/regions";
import { EbayMark } from "./EbayMark";
import { OutboundLink } from "./OutboundLink";

// The eBay listing strips: real listings from eBay's Browse API as image banners (the look of Rift Compare's
// "Chase cards on eBay" strip), read from OUR database: a daily GitHub Actions import stores them, the route
// /api/ebay/<region> reads them. This component never talks to eBay.
//
//   • A page NEVER fetches while it renders (pages stay ISR). The server HTML holds the compact CTA (EbayCta:
//     the wordmark, "Ad" and one search button: what a crawler or a visitor without script sees) on top of an
//     invisible, strip-sized box that reserves the unit's height. Only when the unit scrolls within ~300 px of the
//     viewport does it fetch /api/ebay/<region>?c=<context>; the strip then replaces the box at the SAME height
//     (fixed tile heights: CLS 0). Off-screen units fetch nothing.
//   • When no feed of the cascade has rows (before the first import, a kill switch, too-old rows) the unit is just
//     the compact CTA: it collapses to it once it is entirely out of the viewport (below it, or above where scroll
//     anchoring keeps the page still); in view it keeps its reserved height so nothing moves.
//   • The response is re-validated here (ebay-context.ts acceptResponse): https, eBay image host, an eBay item URL with a campaign
//     id (any: the importer enforced the owner's), whitelisted fields, and the AGE BOUND the route reported (EBAY_LISTING_MAX_AGE_HOURS, default 26 h): rows older
//     than it are never shown, and a tab left open drops them when they cross it (checked on a timer and when the
//     tab returns). Every strip shows how old its data is.
//   • Every tile is one plain <a> through OutboundLink: rel="sponsored nofollow noopener noreferrer", one
//     buy_click { retailer, placement } per click. The href is eBay's affiliate URL EXACTLY as stored (its customid is the per-feed
//     reference the importer asked eBay for, dex-<market>-<feed kind>: nothing here edits it). Thumbnails are plain lazy
//     <img> (no-referrer); one that fails to load hides its tile.
//   • Labelled "Ad", with the affiliate disclosure and "imported from eBay <cadence> (updated <age>)" (the cadence is read from the
//     age bound the route reports: about once a day by default, several times a day in the compliant mode).

// ─── Fetching: one request per region+context, shared by every unit that wants it ──────

const CLIENT_TTL_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 8000;
const CHECK_MS = 60_000;
const REFETCH_MIN_MS = 10 * 60_000;

interface Pending {
  promise: Promise<unknown>;
  at: number;
  users: number;
  ac: AbortController;
  done: boolean;
}
const requests = new Map<string, Pending>();

function acquire(region: Region, context: string, force = false): Pending {
  const key = `${region}|${context}`;
  const hit = requests.get(key);
  if (hit && !force && Date.now() - hit.at < CLIENT_TTL_MS) {
    hit.users++;
    return hit;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  const entry: Pending = { promise: Promise.resolve(null), at: Date.now(), users: 1, ac, done: false };
  entry.promise = fetch(listingsUrl(region, context), { signal: ac.signal, headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((body) => {
      entry.done = true;
      if (!body && requests.get(key) === entry) requests.delete(key); // a failure is not remembered
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

type State = { status: "idle" } | { status: "ready"; a: Accepted } | { status: "none" };

/**
 * Observe `ref`; the first time it comes within 300 px of the viewport (or at once where IntersectionObserver is
 * missing), load the context. Returns the unit's state. While data is shown it is re-checked against its age bound.
 */
function useListings(opts: { region: Region; context: string; placement: Placement; min: number }): { ref: React.RefObject<HTMLDivElement>; state: State; now: number } {
  const { region, context, placement, min } = opts;
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const [round, setRound] = useState(0); // bumped to re-fetch once the shown rows have aged out
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRegion(region) || !isContextString(context)) {
      setState({ status: "none" });
      return;
    }
    const node = ref.current;
    let held: Pending | null = null;
    let cancelled = false;
    const load = (force: boolean) => {
      held = acquire(region, context, force);
      held.promise.then((body) => {
        if (cancelled) return;
        const a = acceptResponse(body, Date.now(), min);
        setNow(Date.now());
        setState(a ? { status: "ready", a } : { status: "none" });
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
  }, [region, context, placement, min, round]);

  // The age bound, enforced here too. The route says how old a row may be (and never returns older); a tab left open
  // for hours must not keep showing rows that have since crossed it: check on a timer and when the tab comes back,
  // drop them for the CTA, and look again (at most every 10 minutes: the daily import may have replaced them).
  const a = state.status === "ready" ? state.a : null;
  useEffect(() => {
    if (!a) return;
    let lastTry = 0;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      if (!isFresh(a)) {
        setState({ status: "none" });
        if (Date.now() - lastTry > REFETCH_MIN_MS) {
          lastTry = Date.now();
          setRound((n) => n + 1);
        }
      }
    };
    const id = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [a]);

  return { ref, state, now };
}

/** Does the browser keep the page still by itself when content above the viewport changes height (CSS scroll anchoring: Chrome, Edge, Firefox; not Safari)? */
const nativeScrollAnchoring = () => typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("overflow-anchor", "auto");

/**
 * `none` (there are no listings to show): true once the unit is entirely outside the viewport, which is when it is safe
 * to drop its reserved height. Without IntersectionObserver, at once.
 *
 * Nothing visible may move (CLS 0). Below the viewport the drop moves nothing that is on screen. Above it, the content under the
 * unit is what the visitor is reading and must stay where it is:
 *   • a browser with scroll anchoring (Chrome, Edge, Firefox) does that by itself, and a script that also moves the scroll position
 *     fights it, so there the unit is simply dropped;
 *   • Safari has no scroll anchoring: there the drop waits until the visitor has stopped scrolling for a moment (so the scroll position
 *     read now is still the one in force when the page changes) and the scroll position is then moved by exactly the height the unit
 *     lost, in the same frame (a layout effect);
 *   • either way, a unit is NOT dropped while the visitor is at the foot of the page: the page would become shorter than their scroll
 *     position, the browser would clamp it and the whole footer would jump (a measured layout shift of 0.4, from the strip above the
 *     footer). It is dropped once they scroll up.
 * `belowOnly` (a grid cell, whose removal reflows the cards after it by whole rows) never drops a unit that is above or in the viewport.
 */
function useCollapsed(ref: React.RefObject<HTMLDivElement>, none: boolean, belowOnly = false): boolean {
  const [collapsed, setCollapsed] = useState(false);
  const was = useRef<{ height: number; scroll: number } | null>(null);
  useEffect(() => {
    if (!none || collapsed) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setCollapsed(true);
      return;
    }
    const anchored = nativeScrollAnchoring();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let armed = false; // the unit is out of the viewport and waiting for the right moment to drop
    const drop = () => {
      timer = undefined;
      armed = false;
      // Judge by where the unit is NOW (the observer's entries may be a frame old, and the visitor may have scrolled back).
      const r = node.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) return;
      const above = r.bottom <= 0;
      if (above && belowOnly) return;
      if (above) {
        const cta = node.querySelector<HTMLElement>('[data-state="cta"]');
        const shrink = r.height - (cta ? cta.offsetHeight : 0);
        if (window.scrollY + window.innerHeight > document.documentElement.scrollHeight - shrink) {
          armed = true; // at the foot of the page: not now
          return;
        }
      }
      was.current = above && !anchored ? { height: r.height, scroll: window.scrollY } : null;
      setCollapsed(true);
    };
    const settle = () => {
      if (timer) clearTimeout(timer);
      armed = true;
      timer = setTimeout(drop, 250);
    };
    const onScroll = () => {
      if (armed) settle(); // still scrolling: look again at the next pause
    };
    const io = new IntersectionObserver((entries) => {
      if (!entries.every((e) => !e.isIntersecting)) return;
      const r = node.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) return;
      if (r.bottom <= 0 && !anchored) settle(); // above, without scroll anchoring: after the scrolling stops
      else drop();
    });
    io.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ref, none, collapsed, belowOnly]);
  useLayoutEffect(() => {
    if (!collapsed || !was.current) return;
    const node = ref.current;
    const { height, scroll } = was.current;
    was.current = null;
    // An ABSOLUTE target (not a relative nudge): the scroll position was read at the pause and has not moved since.
    if (node) window.scrollTo(window.scrollX, Math.max(0, scroll + (node.getBoundingClientRect().height - height)));
  }, [collapsed, ref]);
  return collapsed;
}

// ─── Pieces ────────────────────────────────────────────────────────────────────

const Arrow = () => <span aria-hidden="true">↗</span>;

export type StripVariant = "full" | "slim";

/** What the compact CTA searches eBay for. */
export interface StripSearch {
  kind?: "sealed" | "card";
  /** A product, set or type name; "" = Pokémon sealed (or chase cards) in general. */
  query?: string;
  /** The CTA's words, when "Search <query> on eBay" is not the right sentence. */
  label?: string;
}

const DEFAULT_HEADINGS: Record<FeedKind, string> = {
  chase: "Chase cards on eBay",
  sealed: "Sealed Pokémon on eBay",
  set: "Chase cards on eBay",
  type: "Sealed Pokémon on eBay",
  item: "Sealed Pokémon on eBay",
};

const SITE_SUFFIX: Partial<Record<Region, string>> = { nz: " Australia", sg: " US" };

function searchHref(region: Region, placement: Placement, s: StripSearch): string {
  return s.kind === "card" ? ebayCardSearchUrl(s.query || "special illustration rare", region, placement) : ebaySearchUrl(s.query ?? "", region, placement);
}

function ctaLabel(s: StripSearch): string {
  if (s.label) return s.label;
  const q = (s.query ?? "").trim();
  if (s.kind === "card") return q ? `Search ${q.slice(0, 36)} on eBay` : "Search Pokémon chase cards on eBay";
  return q ? `Search ${q.length > 38 ? `${q.slice(0, 37)}…` : q} on eBay` : "Search Pokémon sealed on eBay";
}

/** The compact single-row unit: wordmark, "Ad", one search button, the short affiliate note. What a strip is when there is nothing to list. */
export function EbayCta({ region, placement, search, site, reserveNote = false, className = "" }: { region: Region; placement: Placement; search: StripSearch; site?: string; reserveNote?: boolean; className?: string }) {
  return (
    <div data-ad={placement} data-state="cta" role="group" aria-label="Sponsored: eBay search" className={`ad-box px-3 py-2.5 sm:px-4 ${className}`}>
      <div className="flex items-center gap-x-3">
        <span className="flex shrink-0 items-center gap-2">
          <EbayMark className="text-lg" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ad{site ? ` · ${site}` : ""}</span>
        </span>
        <OutboundLink href={searchHref(region, placement, search)} rel={REL_SPONSORED} retailer={ebayRetailer(region)} placement={placement} className="btn-ad ml-auto min-w-0 max-w-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
          <span className="truncate">{ctaLabel(search)}</span> <Arrow />
        </OutboundLink>
      </div>
      <p className={`mt-1.5 text-[11px] leading-4 text-muted ${reserveNote ? "min-h-8 sm:min-h-4" : ""}`}>{AFFILIATE_NOTE_SHORT} Goes to {ebayLabel(region)}.</p>
    </div>
  );
}

/**
 * NZ and SG visitors are served the AU / US feeds, whose shipping was priced to Australia and the US (and which may not ship to NZ or
 * SG at all): their tiles make no shipping claim ("Shipping on eBay", never "Free shipping" or a cost), and the disclosure says whose
 * listings these are.
 */
const SHARED_FEED_NOTE: Partial<Record<Region, string>> = {
  nz: "These are eBay Australia listings (the eBay New Zealand buyers use); delivery to New Zealand is not shown here, so check it on eBay.",
  sg: "These are eBay US listings (the eBay Singapore buyers use); delivery to Singapore is not shown here, so check it on eBay.",
};
const SHARED_FEED_SHORT: Partial<Record<Region, string>> = { nz: "From eBay Australia; delivery to New Zealand is not shown.", sg: "From eBay US; delivery to Singapore is not shown." };
function shipFor(region: Region, ship: AcceptedItem["ship"]): { text: string; free: boolean } {
  return SHARED_FEED_NOTE[region] ? { text: "Shipping on eBay", free: false } : shipLabel(ship);
}

const DISCLOSURE = "Affiliate link: as an eBay Partner Network affiliate, DexCompare earns from qualifying purchases — at no extra cost to you.";

/** The disclosure under every strip: the affiliate note, and how old the data is (eBay's API licence asks for exactly that). */
function Disclosure({ age, maxAgeMs, region, regionNote }: { age: string; maxAgeMs: number; region: Region; regionNote: boolean }) {
  return (
    <p className="mt-3 text-[11px] leading-4 text-muted sm:text-xs sm:leading-5">
      {DISCLOSURE} Listings are imported from eBay {importCadence(maxAgeMs)} (updated {age}), so price and availability may have changed; check eBay.
      {regionNote && SHARED_FEED_NOTE[region] ? ` ${SHARED_FEED_NOTE[region]}` : ""}
    </p>
  );
}

// ─── Tiles ─────────────────────────────────────────────────────────────────────
// Every height in a tile is fixed (title: two lines of 18px, price, shipping and condition lines of fixed
// height, a 3:4 thumbnail box), so the skeleton and the listings are the same size and nothing moves.

const TILE_W: Record<StripVariant, string> = { full: "w-[148px] sm:w-[164px]", slim: "w-[148px] sm:w-[164px]" };
// A card is portrait (3:4); a sealed product's photo is a box, near square. The shape follows the CONTEXT (not the feed that answers: a
// chase or set context only ever cascades to chase cards, a sealed / type / item context only to sealed product), so the skeleton and
// the listings are the same size.
const THUMB: Record<StripVariant, { portrait: string; square: string }> = {
  full: { portrait: "aspect-[3/4] w-full", square: "aspect-square w-full" },
  slim: { portrait: "h-36 w-full", square: "h-36 w-full" },
};
const isCardContext = (context: string) => context === "chase" || context.startsWith("set:");
const TILE_BOX = "group flex h-full flex-col rounded-lg border border-line bg-surface p-2 transition-colors hover:border-ink/40";

function Tile({ item, region, placement, variant, portrait, onBroken }: { item: AcceptedItem; region: Region; placement: Placement; variant: StripVariant; portrait: boolean; onBroken: (id: string) => void }) {
  const ship = shipFor(region, item.ship);
  const cond = conditionLabel(item.condition);
  return (
    <OutboundLink
      href={item.href}
      rel={REL_SPONSORED}
      retailer={ebayRetailerForHref(item.href, region)}
      placement={placement}
      className={TILE_BOX}
      // A tile that is only partly inside the phone row is brought fully into view when it takes keyboard focus.
      onFocus={(e) => e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest" })}
    >
      <span className={`relative block shrink-0 overflow-hidden rounded-md bg-raised ${THUMB[variant][portrait ? "portrait" : "square"]}`}>
        {/* eBay's own picture, as eBay serves it: a plain <img> (never proxied or resized by us). A failed one hides its tile.
            alt="" because the title follows in the same link (a screen reader would otherwise read it twice). */}
        <img
          src={item.imageUrl}
          alt=""
          width={500}
          height={500}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => onBroken(item.id)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </span>
      <span className="mt-2 line-clamp-2 block h-9 text-xs font-semibold leading-[18px] group-hover:text-brand">{item.title}</span>
      <span className="mt-1 flex h-5 items-baseline gap-1 leading-5">
        <span className="tabular min-w-0 truncate text-[15px] font-bold">{formatPrice(item.price)}</span>
        <span className="ml-auto shrink-0 text-xs font-semibold text-brand" aria-hidden="true">
          <Arrow />
        </span>
      </span>
      <span className={`block h-4 truncate text-[11px] leading-4 ${ship.free ? "font-medium text-open" : "text-muted"}`}>
        {ship.text}
        {cond && <span className="font-normal text-muted"> · {cond}</span>}
      </span>
      <span className="sr-only"> View on eBay (opens in a new tab)</span>
    </OutboundLink>
  );
}

function SkeletonTile({ variant, portrait }: { variant: StripVariant; portrait: boolean }) {
  return (
    <div aria-hidden="true" className={TILE_BOX}>
      <span className={`block shrink-0 rounded-md bg-raised ${THUMB[variant][portrait ? "portrait" : "square"]}`} />
      <span className="mt-2 block h-9" />
      <span className="mt-1 block h-5" />
      <span className="block h-4" />
    </div>
  );
}

/** The row: a scroll-snap strip on phones (the unit scrolls, never the page) and a fixed grid from lg. `narrow`: always the scroll row (a column that cannot fit six). */
function TileRow({ variant, label, narrow, fit, children }: { variant: StripVariant; label: string; narrow: boolean; fit: boolean; children: ReactNode }) {
  const cols = fit ? "lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]" : variant === "slim" ? "lg:grid-cols-4" : "lg:grid-cols-6";
  const grid = narrow ? "" : `lg:grid lg:overflow-visible lg:pb-1 ${cols}`;
  // px-1/pt-1 (and the negative margins that cancel them) give the focus ring room inside the scrolling row, which would clip it.
  return (
    <ul role="list" aria-label={label} className={`relative -mx-1 mt-2 flex snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1 [scrollbar-width:thin] ${grid}`}>
      {children}
    </ul>
  );
}

function TileItem({ variant, narrow, children }: { variant: StripVariant; narrow: boolean; children: ReactNode }) {
  return <li className={`shrink-0 snap-start ${TILE_W[variant]} ${narrow ? "" : "lg:w-auto"}`}>{children}</li>;
}

/**
 * The top line, as in Rift Compare's strip: wordmark, "AD · LIVE LISTINGS ON EBAY", the headline, and how old the data is.
 * One row from sm up (the headline beside the label); on a phone, and always in a `narrow` column (the product page's right column,
 * where the headline would be cut to "Sun & Moon Booster Box on e..."), the headline is a row of its own. Fixed row heights, so the skeleton matches.
 */
function TopLine({ site, heading, age, twoLine, narrow }: { site: string; heading: string; age: string; twoLine: boolean; narrow: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="order-1 flex min-w-0 items-center gap-2">
        <EbayMark className="text-lg" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">Ad · Live listings on eBay{site}</span>
      </div>
      {/* A long product name wraps to two lines (the whole name, not "Ascended Heroes - Focused Fighters Premi…"); the height is reserved either way. */}
      <p title={heading} className={`order-3 block w-full min-w-0 font-display text-base font-bold leading-6 tracking-tight ${narrow ? "" : "sm:order-2 sm:w-auto sm:flex-1 sm:text-lg"} ${twoLine ? "line-clamp-2 h-12" : "h-6 truncate"}`}>
        {heading}
      </p>
      <span className={`order-2 ml-auto shrink-0 text-[11px] text-muted ${narrow ? "" : "sm:order-3 sm:text-xs"}`}>Updated {age}</span>
    </div>
  );
}

// ─── The strip ─────────────────────────────────────────────────────────────────

const SHOWN: Record<StripVariant, number> = { full: 6, slim: 4 };

export interface EbayStripProps {
  region: Region;
  /** "chase" | "sealed" | "set:<slug>" | "type:<slug>" | "item:<slug>" (ebay-context.ts isContextString). */
  context: string;
  placement: Placement;
  variant?: StripVariant;
  /** The headline per feed kind: the cascade decides which feed answers, so the page supplies the words for each it might. */
  headings?: Partial<Record<FeedKind, string>>;
  /** What the compact CTA (shown when there is nothing to list) searches eBay for. */
  search?: StripSearch;
  /** "US" on the landing page (no region of its own): the strip says which eBay. */
  site?: string;
  /** Inside a column too narrow for six tiles (the product page's right column): always the scroll row. */
  narrow?: boolean;
  /**
   * False only on the 404 page, whose region is read after mount (it renders for the US and switches): anything that would change the
   * unit's HEIGHT with the region is then left out or reserved, so nothing moves after the first paint. The NZ / SG sentence of the
   * disclosure is left out (the top line, "Live listings on eBay Australia", and the "Shipping on eBay" lines carry it) and the compact
   * CTA's note keeps two lines on a phone ("Goes to ebay.com.au" wraps where "Goes to ebay.com" does not).
   */
  regionKnown?: boolean;
  className?: string;
}

export function EbayStrip({ region, context, placement, variant = "full", headings, search = {}, site, narrow = false, regionKnown = true, className = "" }: EbayStripProps) {
  const count = SHOWN[variant];
  const portrait = isCardContext(context);
  const min = Math.min(2, count);
  const { ref, state, now } = useListings({ region, context, placement, min: Math.max(1, min) });
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  const items = state.status === "ready" ? state.a.items.slice(0, count).filter((i) => !broken.has(i.id)) : null;
  const none = state.status === "none" || (!!items && items.length < Math.max(1, min));
  const collapsed = useCollapsed(ref, none);
  const siteName = site ? ` ${site}` : SITE_SUFFIX[region] ?? "";
  // A product's name can be long: any heading over 34 characters (the phone row holds about that many) gets two lines, reserved from the start.
  const twoLine = Object.values(headings ?? {}).some((h) => h.length > 34);
  // A product page's strip carries the order note when its own listings answer (item feeds are stored lowest price first): the line is reserved either way.
  const orderNote = context.startsWith("item:");

  const cta = <EbayCta region={region} placement={placement} search={search} site={siteName.trim() || undefined} reserveNote={!regionKnown} />;
  // The strip's markup, with real tiles or with skeletons: ONE function, so the reserved box and the strip are the same height.
  const body = (shown: AcceptedItem[] | null, heading: string, age: string, feed: FeedKind | null, maxAgeMs: number, fitN: number | null = null) => (
    <>
      <TopLine site={siteName} heading={heading} age={age} twoLine={twoLine} narrow={narrow} />
      {orderNote && (
        <p className="mt-1 h-4 text-[11px] leading-4 text-muted">{feed === "item" ? "Lowest price first, before shipping" : "\u00a0"}</p>
      )}
      <TileRow variant={variant} narrow={narrow} fit={fitN != null} label={`${heading} (ads)`}>
        {shown
          ? shown.map((it) => (
              <TileItem key={it.id} variant={variant} narrow={narrow}>
                <Tile item={it} region={region} placement={placement} variant={variant} portrait={portrait} onBroken={(id) => setBroken((s) => new Set(s).add(id))} />
              </TileItem>
            ))
          : Array.from({ length: count }, (_, i) => (
              <TileItem key={i} variant={variant} narrow={narrow}>
                <SkeletonTile variant={variant} portrait={portrait} />
              </TileItem>
            ))}
      </TileRow>
      <Disclosure age={age} maxAgeMs={maxAgeMs} region={region} regionNote={regionKnown} />
    </>
  );

  // ONE wrapper element in every state (the ref, and the scroll compensation of useCollapsed, need it to persist).
  if (none && collapsed) return <div ref={ref} className={className}>{cta}</div>;
  // Not known yet (before the fetch, while it runs, and in the server-rendered page), or none and still in view: the CTA on top
  // of an invisible, strip-sized box. The CTA is what a crawler or a visitor without script sees; the box keeps the unit's height,
  // so the strip replaces it without moving the page. (Stacked in one grid cell: the taller of the two sets the height; the column
  // is minmax(0,1fr) so the scrolling tile row cannot widen it.)
  if (!items || none) {
    return (
      <div ref={ref} className={`grid grid-cols-[minmax(0,1fr)] ${className}`}>
        <div aria-hidden="true" className="ad-box invisible col-start-1 row-start-1 p-3 sm:p-4">
          {body(null, headings?.chase ?? DEFAULT_HEADINGS.chase, "26 h ago", null, hoursToMs(DEFAULT_MAX_AGE_HOURS))}
        </div>
        <div className="col-start-1 row-start-1 self-start">{cta}</div>
      </div>
    );
  }
  const a = state.status === "ready" ? state.a : null!;
  const heading = headings?.[a.feed] ?? DEFAULT_HEADINGS[a.feed];
  const label = `${heading} (ads)`;
  // Fewer tiles than the row holds (a feed with 2-5 listings): on a wide screen the frame is only as wide as its tiles (but never narrower than its top line).
  const cols = variant === "slim" ? 4 : 6;
  const fitN = !narrow && items.length < cols ? items.length : null;
  const partial = fitN != null ? ({ "--n": fitN } as React.CSSProperties) : undefined;
  return (
    <div
      ref={ref}
      data-ad={placement}
      data-feed={a.feed}
      data-state="ready"
      role="group"
      aria-label={`Sponsored: ${label}`}
      style={partial}
      className={`ad-box p-3 sm:p-4 ${partial ? "lg:max-w-[max(34rem,calc(var(--n)*176px+34px))]" : ""} ${className}`}
    >
      {body(items, heading, formatAge(now - a.fetchedAtMs), a.feed, a.maxAgeMs, fitN)}
    </div>
  );
}

// ─── Above the footer ──────────────────────────────────────────────────────────

/**
 * The slim strip above every content page's footer (4 tiles). Which feed depends on the page (lib/ebay-ads.ts preFooterPlan):
 * the one the page's own strip is not. A region's home page has none.
 */
export function PreFooterStrip({ region }: { region: Region }) {
  const path = usePathname() || "";
  const plan = preFooterPlan(path, region);
  if (!plan) return null; // a region's home page: it has two strips of its own and renders <NoPreFooter/>
  // Keyed by page: a soft navigation starts a fresh unit instead of showing the previous page's tiles until the new fetch answers.
  return <EbayStrip key={`${region}|${path}|${plan.context}`} region={region} context={plan.context} placement="listings-footer" variant="slim" search={{ kind: plan.context === "chase" ? "card" : "sealed", query: "" }} />;
}

// ─── The in-feed tile (browse grid) ────────────────────────────────────────────

/**
 * In /[region]/sealed's grid, after the 12th product: ONE real listing as a labelled sponsored card the size of a product card
 * (the 7th listing of the sealed feed: the strip at the top of the page shows the first six). Reserved as an invisible cell
 * until the data is known, so the cards after it do not shift; with no 7th listing it is removed once it is out of the viewport.
 */
export function EbayFeedTile({ region }: { region: Region }) {
  const placement: Placement = "listings-browse-feed";
  const { ref, state, now } = useListings({ region, context: "sealed", placement, min: 7 });
  const [broken, setBroken] = useState(false);
  const a = state.status === "ready" ? state.a : null;
  const item = a && !broken ? a.items[6] ?? null : null;
  const none = state.status === "none" || (state.status === "ready" && !item);
  const collapsed = useCollapsed(ref, none, true);
  if (none && collapsed) return null;
  if (!a || !item) return <div ref={ref} aria-hidden="true" className="invisible min-h-[16rem]" />;
  const ship = shipFor(region, item.ship);
  const cond = conditionLabel(item.condition);
  return (
    <div ref={ref} data-ad={placement} data-feed={a.feed} data-state="ready" role="group" aria-label="Sponsored: eBay listing (ad)" className="flex">
      <OutboundLink href={item.href} rel={REL_SPONSORED} retailer={ebayRetailerForHref(item.href, region)} placement={placement} className="group ad-box flex flex-1 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift">
        <span className="relative block aspect-square bg-surface">
          <img src={item.imageUrl} alt="" width={500} height={500} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-contain p-4" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-muted shadow-card">
            <EbayMark className="text-sm" /> Ad
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="line-clamp-2 block min-h-[2.5rem] text-sm font-semibold leading-snug group-hover:text-brand sm:text-[15px]">{item.title}</span>
          <span className="tabular block font-display text-lg font-bold">{formatPrice(item.price)}</span>
          <span className={`block text-xs ${ship.free ? "font-medium text-open" : "text-muted"}`}>
            {ship.text}
            {cond ? ` · ${cond}` : ""}
          </span>
          <span className="mt-auto block pt-1 text-xs font-semibold text-brand">
            View on eBay <Arrow />
          </span>
          <span className="block text-[11px] leading-4 text-muted">
            {AFFILIATE_NOTE_SHORT} Imported from eBay {importCadence(a.maxAgeMs)} (updated {formatAge(now - a.fetchedAtMs)}); check eBay.
            {SHARED_FEED_SHORT[region] ? ` ${SHARED_FEED_SHORT[region]}` : ""}
          </span>
        </span>
      </OutboundLink>
    </div>
  );
}
