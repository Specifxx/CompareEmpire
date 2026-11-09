"use client";

// The paid featured listings (lib/featured-ads.ts): a labelled box on the region home, drawn in the browser from RiftCompare's
// feed once the page has loaded. Nothing shows (and no space is reserved) while there are none. Never a price row, never ranked,
// never counted in a comparison: it says so, and "Paid link" on the box itself.
import { useEffect, useState } from "react";
import { ADS_FEED, WEEK_PRICE_USD, adsToShow, hostOf, type FeaturedAd } from "@/lib/featured-ads";

export function FeaturedAds({ region, className = "" }: { region: string; className?: string }) {
  const [ads, setAds] = useState<FeaturedAd[]>([]);
  useEffect(() => {
    let live = true;
    const run = () =>
      fetch(ADS_FEED)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => live && setAds(adsToShow(j?.ads, region, Date.now())))
        .catch(() => {});
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 800);
    return () => {
      live = false;
    };
  }, [region]);
  if (ads.length === 0) return null;
  return (
    <section aria-label="Featured listings" className={className} data-featured-ads>
      {ads.map((a) => (
        <div key={a.id} className="ad-box mb-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-ad-line px-4 py-2">
            <span className="rounded bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-surface">Featured listing</span>
            <span className="ad-pill">Paid link</span>
            <span className="ml-auto text-xs text-muted">Not part of the comparison</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.image} alt={a.title} width={96} height={96} loading="lazy" referrerPolicy="no-referrer" className="plate h-24 w-24 shrink-0 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            <div className="min-w-0 flex-1 basis-60">
              <p className="font-display text-base font-bold leading-snug">{a.title}</p>
              {a.blurb && <p className="mt-0.5 text-sm text-muted">{a.blurb}</p>}
              <p className="mt-1 text-sm">
                {a.price && <span className="font-bold">{a.price}</span>}
                <span className="text-muted">{a.price ? " · " : ""}on {hostOf(a.url)}</span>
              </p>
            </div>
            <a href={a.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className="btn-ad shrink-0">
              View listing
            </a>
          </div>
        </div>
      ))}
      <p className="text-right text-xs">
        <a href="/advertise" className="font-semibold text-brand-strong hover:underline">
          Feature your listing · US${WEEK_PRICE_USD} a week →
        </a>
      </p>
    </section>
  );
}
