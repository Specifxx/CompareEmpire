"use client";

// The landing page's region grid: eight products in stock in the visitor's region (the region home's newest booster boxes and ETBs,
// /api/picks/<region>), with a switcher for the seven regions right above it. Which region: the visitor's last one, else their
// country (Vercel's x-vercel-ip-country through /api/geo, Accept-Language when there is none), else their time zone
// (RegionSuggest.tsx useSuggestedRegion). Nothing is redirected and the server HTML is the same for everyone, crawlers included:
// a heading, the seven region links and eight reserved card slots, filled in the browser. The slots are sized before anything
// loads, so filling them moves nothing.
import Link from "next/link";
import { useEffect, useState } from "react";
import { homeRegionEvent } from "@/lib/click-events";
import { money, plural } from "@/lib/format";
import { thumb } from "@/lib/images";
import { REGION_LIST, REGIONS, X_DEFAULT_REGION, type Region } from "@/lib/regions";
import { send } from "@/lib/track-client";
import { useSuggestedRegion, type RegionSource } from "./RegionSuggest";

export interface Pick {
  slug: string;
  name: string;
  type: string;
  img: string | null;
  cents: number | null;
  stores: number;
  tcg: boolean;
}

const cache = new Map<Region, Promise<Pick[]>>();
function picksFor(region: Region): Promise<Pick[]> {
  let p = cache.get(region);
  if (!p) {
    p = fetch(`/api/picks/${region}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ picks: Pick[] }>) : { picks: [] }))
      .then((j) => (Array.isArray(j.picks) ? j.picks.slice(0, 8) : []))
      .catch(() => []);
    cache.set(region, p);
  }
  return p;
}

const SLOTS = 8;

/**
 * `initial`: the x-default region's picks, rendered on the server (SEO sprint, 2026-10-23: the listings are in the initial HTML for
 * crawlers and for a visitor without script). The grid shows them until the visitor's region is known, then swaps if it differs.
 */
export function HomeRegionGrid({ initial }: { initial?: { region: Region; picks: Pick[] } } = {}) {
  const suggested = useSuggestedRegion();
  const [picked, setPicked] = useState<Region | null>(null);
  if (initial && !cache.has(initial.region)) cache.set(initial.region, Promise.resolve(initial.picks.slice(0, SLOTS)));
  const region: Region | null = picked ?? (suggested.known ? suggested.region ?? X_DEFAULT_REGION : initial?.region ?? null);
  const source: RegionSource | null = picked ? "picked" : suggested.source;
  const [picks, setPicks] = useState<{ region: Region; list: Pick[] } | null>(initial ? { region: initial.region, list: initial.picks.slice(0, SLOTS) } : null);

  useEffect(() => {
    if (!region) return;
    let live = true;
    picksFor(region).then((list) => {
      if (!live) return;
      setPicks({ region, list });
      // the server-rendered region shown before the visitor's is known is not a region view
      if (picked || suggested.known) send(homeRegionEvent(region, source ?? "default"));
    });
    return () => {
      live = false;
    };
  }, [region, source, picked, suggested.known]);

  const r = region ? REGIONS[region] : null;
  const list = picks && picks.region === region ? picks.list : null;

  return (
    <section aria-labelledby="home-grid-h" className="page" data-home-grid="">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="home-grid-h" className="font-display text-2xl font-bold tracking-tight">
          {/* fixed text width while the region is unknown: the heading never reflows the switcher under it */}
          In stock {r ? `in ${r.inName}` : "near you"} today
        </h2>
        {/* always laid out (hidden until the region is known), so its arrival never moves the heading or the switcher */}
        <Link
          href={`/${(r ?? REGIONS[X_DEFAULT_REGION]).region}`}
          prefetch={false}
          style={{ visibility: r ? "visible" : "hidden" }}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Everything in {(r ?? REGIONS[X_DEFAULT_REGION]).inName} →
        </Link>
      </div>
      {/* The region switcher: real links (they work without script, and crawl to every region home); with script, a click
          swaps the grid in place and remembers the choice, as the header's switcher does. */}
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Choose your region">
        {REGION_LIST.map((x) => (
          <li key={x.region}>
            <a
              href={`/${x.region}`}
              aria-current={x.region === region ? "true" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                setPicked(x.region);
                try {
                  localStorage.setItem("dex-region", x.region);
                } catch {
                  /* storage blocked */
                }
              }}
              className={`chip min-h-10 ${x.region === region ? "chip-on" : ""}`}
            >
              <span aria-hidden="true">{x.flag}</span> {x.short}
            </a>
          </li>
        ))}
      </ul>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={list ? undefined : true}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const p = list?.[i];
          return (
            <li key={i} className="card h-[17.5rem] overflow-hidden sm:h-[18.5rem]">
              {p && r ? (
                <Link href={`/${r.region}/p/${p.slug}`} prefetch={false} className="group flex h-full flex-col">
                  <div className="flex h-36 items-center justify-center bg-raised p-3 sm:h-40">
                    {p.img ? (
                      <img src={thumb(p.img, 240)!} alt="" width={140} height={140} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-faint">{p.type}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{p.type}</span>
                    <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 group-hover:text-brand">{p.name}</span>
                    <span className="mt-auto pt-1.5">
                      <span className="tabular block font-display text-lg font-extrabold">{p.cents != null ? money(p.cents, r.market) : "—"}</span>
                      <span className="block text-xs text-muted">
                        {p.stores > 0 ? `in stock at ${plural(p.stores, "store")}` : "in stock"}
                        {p.tcg && r.market === "US" ? " + TCGplayer" : ""}
                      </span>
                    </span>
                  </div>
                </Link>
              ) : list && r ? (
                i === 0 ? (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted">Nothing in stock to show here right now.</div>
                ) : null
              ) : (
                <div className="h-full animate-pulse bg-raised/60" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>
      {r && (
        <p className="mt-3 text-xs text-muted">
          Cheapest in-stock price at the {r.adjective} stores we compare, in {r.currency}, excluding shipping.{" "}
          {source === "geo" || source === "language" ? "Region suggested from your location; pick another above." : "Pick another region above."}
        </p>
      )}
    </section>
  );
}
