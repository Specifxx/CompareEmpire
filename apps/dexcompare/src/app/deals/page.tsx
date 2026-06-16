import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { getTopDeals } from "@/lib/deals";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";

// Per-request: deals are computed for the visitor's market.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pokémon card deals — biggest discounts vs market price",
  description:
    "Pokémon singles selling well below their TCGplayer market price right now, across stores in Australia, New Zealand, the US and the UK. Updated daily — the fastest way to snipe underpriced cards.",
  alternates: { canonical: "/deals" },
};

export default async function DealsPage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const deals = await getTopDeals(60, country);

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">🔥 Today&apos;s best Pokémon deals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Cards listed by {info.adjective} stores <strong className="text-white">well below their TCGplayer
            market price</strong> right now. Every deal shows the live store price next to the market guide —
            click through and snipe it before someone else does.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            We only count real market guides (TCGplayer) and cap discounts at 70% — deeper than that is
            usually a listing error, not a deal. Refreshed with every import.
          </p>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      {deals.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center">
          <p className="text-lg font-semibold text-white">No standout deals in {info.place} right now</p>
          <p className="mt-1 text-sm text-slate-400">
            Deals appear when a store undercuts the market guide by 15% or more — check back after the next
            price refresh, or browse the cheapest cards instead.
          </p>
          <Link href="/browse?priced=1&sort=price_asc" className="btn-primary mt-4">Browse cheapest cards</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {deals.map((d) => (
            <div key={d.card.id}>
              <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
                <span className="text-emerald-400">▼ {d.pct}% vs market</span>
                <span className="text-slate-500 line-through">{formatMoney(d.guideCents, info.currency)}</span>
              </div>
              <CardTile card={d.card} />
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-600">
        Market guide is TCGplayer&apos;s market price converted to {info.currency} at an indicative rate.
        Always confirm price and condition on the store&apos;s site before buying.
      </p>
    </div>
  );
}
