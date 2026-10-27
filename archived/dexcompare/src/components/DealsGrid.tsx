"use client";

import Link from "next/link";
import { CardTile } from "./CardTile";
import { useCountry } from "./CountryProvider";
import { COUNTRIES, type Country } from "@/lib/country";
import type { Deal } from "@/lib/deals";

// The /deals grid for every market, picked client-side by the active region.
// Same reasoning as <DealsRail>: the page is ISR-cached and cookie-free, so the
// server can't know the visitor's market, and a deal is a per-market SELECTION
// rather than a price CardTile can re-derive. Shipping all three lists and
// choosing here is what makes the region switcher actually change this page.
export function DealsGrid({ dealsByMarket }: { dealsByMarket: Partial<Record<Country, Deal[]>> }) {
  const { country, fmt } = useCountry();
  const deals = dealsByMarket[country] ?? [];

  if (deals.length === 0) {
    return (
      <div className="card-surface grid place-items-center p-16 text-center">
        <p className="text-lg font-semibold text-white">
          No standout deals in {COUNTRIES[country].place} right now
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Deals appear when a store undercuts the market guide by 15% or more — check back after the next
          price refresh, or browse the cheapest cards instead.
        </p>
        <Link href="/browse?priced=1&sort=price_asc" className="btn-primary mt-4">Browse cheapest cards</Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">
        Showing <strong className="text-white">{COUNTRIES[country].adjective}</strong> store prices, in{" "}
        {COUNTRIES[country].currency}.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {deals.map((d) => (
          <div key={d.card.id}>
            <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
              <span className="num text-up">−{d.pct}% vs market</span>
              {/* fmt(), not the server's baseline currency — this has to agree
                  with the tile price directly beneath it. */}
              <span className="num text-slate-500 line-through">{fmt(d.guideCents)}</span>
            </div>
            <CardTile card={d.card} />
          </div>
        ))}
      </div>
    </>
  );
}
