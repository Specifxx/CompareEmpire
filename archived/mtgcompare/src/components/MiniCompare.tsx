"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OutboundLink } from "./OutboundLink";
import { useCountry } from "./CountryProvider";
import { affiliateUrl } from "@/lib/affiliate";

// The game→comparison bridge: a compact, zero-navigation price comparison shown
// right inside game result screens. Players just spent minutes caring about a
// card's value — this shows the three cheapest REAL stores for it on the spot,
// with buy buttons (click kind "game" so conversion is measurable in /api/click
// analytics). One more click reaches the full comparison page.
interface PriceRow {
  id: string;
  retailer: string;
  retailerName: string;
  priceCents: number;
  url: string;
  inStock: boolean;
  country: string;
  isFoil: boolean;
}

export function MiniCompare({ cardIdOrSlug, heading }: { cardIdOrSlug: string; heading?: string }) {
  const { country, fmt } = useCountry();
  const [rows, setRows] = useState<PriceRow[] | null>(null);
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/card/${encodeURIComponent(cardIdOrSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const card = d.card ?? d;
        const all: PriceRow[] = card?.retailerPrices ?? [];
        setRows(all.filter((p) => p.inStock && p.country === country && !p.isFoil).slice(0, 3));
        setHref(`/card/${card?.slug ?? cardIdOrSlug}`);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [cardIdOrSlug, country]);

  // No listings in this market → still convert the curiosity, via the full page.
  if (rows && rows.length === 0) {
    return href ? (
      <Link href={href} className="mt-3 inline-block text-sm font-semibold text-brand-400 hover:underline">
        Check live prices for this card →
      </Link>
    ) : null;
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900/70 p-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {heading ?? "Buy it for real — cheapest stores"}
        </span>
        <span className="chip bg-brand-500/15 text-[10px] font-semibold text-brand-300">live</span>
      </div>
      {rows === null ? (
        <div className="mt-2 space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-ink-800" />
          ))}
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{p.retailerName}</span>
              <span className={`shrink-0 text-sm font-bold ${i === 0 ? "text-accent" : "text-slate-300"}`}>
                {fmt(p.priceCents)}
              </span>
              <OutboundLink
                href={affiliateUrl(p.url)}
                retailer={p.retailer}
                country={country}
                kind="game"
                className="btn-primary shrink-0 px-3 py-1 text-xs"
              >
                Buy →
              </OutboundLink>
            </li>
          ))}
        </ul>
      )}
      {href && (
        <Link href={href} className="mt-2 block text-center text-xs font-semibold text-brand-400 hover:underline">
          Full comparison — every store we track →
        </Link>
      )}
    </div>
  );
}
