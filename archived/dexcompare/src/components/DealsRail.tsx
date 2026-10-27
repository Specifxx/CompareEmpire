"use client";

import Link from "next/link";
import { CardTile } from "./CardTile";
import { useCountry } from "./CountryProvider";
import { COUNTRIES, type Country } from "@/lib/country";
import type { Deal } from "@/lib/deals";

// Deals for EVERY market, picked client-side by the active region.
//
// Why it has to work this way: every page is ISR-cached with no cookie read (that
// read is what used to force per-request rendering and burn the Neon allowance),
// so the server render is market-NEUTRAL and `router.refresh()` on a region change
// returns the very same cached HTML. That's fine for CardTile, which re-prices
// itself from the four price columns each card already carries — but a deal is not
// just a price. It's a *selection*: which cards are underpriced, by what %, and
// against which converted guide, all computed per market by the importer.
//
// So switching to US previously kept showing the AUSTRALIAN deal list with an
// AUD strike-through price sitting next to a USD tile price. The fix is to ship
// all three markets' rows in the cached payload and choose here. That's cheap:
// Deal is a ~400-row precomputed table and getTopDeals is cached per market, so
// this is three small indexed reads, not three catalogue scans.

// Horizontal snap carousel with faded scroll edges. Mirrors the helper in
// app/page.tsx (kept local there for its other rails).
function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <div className="edge-fade snap-x-mandatory -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {children}
    </div>
  );
}

export function DealsRail({ dealsByMarket }: { dealsByMarket: Partial<Record<Country, Deal[]>> }) {
  const { country, fmt } = useCountry();
  const deals = dealsByMarket[country] ?? [];

  // Below 4 there isn't enough to fill the rail; hide it rather than show a stub.
  // Deliberately per-market: a market with thin coverage simply doesn't get a rail,
  // instead of borrowing another market's deals and mislabelling them.
  if (deals.length < 4) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
            <span aria-hidden>🔥</span>
            Today&apos;s best deals
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {COUNTRIES[country].adjective} store prices well below the TCGplayer market guide right now.
          </p>
        </div>
        <Link href="/deals" className="btn-ghost shrink-0 text-xs">All deals →</Link>
      </div>
      <Carousel>
        {deals.map((d) => (
          <div key={d.card.id} className="w-36 shrink-0 snap-start sm:w-44">
            <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
              <span className="num text-up">−{d.pct}%</span>
              {/* fmt(), not a hardcoded "AUD" — this strike-through has to agree
                  with the tile's currency directly beneath it. */}
              <span className="num text-slate-500 line-through">{fmt(d.guideCents)}</span>
            </div>
            <CardTile card={d.card} />
          </div>
        ))}
      </Carousel>
    </section>
  );
}
