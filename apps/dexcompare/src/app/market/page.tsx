import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { PriceChart, changeOver } from "@/components/PriceChart";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { getMarketIndex, scopeChips, scopeFromParam } from "@/lib/market-index";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";

// Per-request: the index is computed for the visitor's market (cookie).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The DexCompare Index — how the Pokémon card market is moving",
  description:
    "A stock-style index of the Pokémon TCG singles market: daily price trend of the most valuable cards, risers vs fallers, biggest movers, market cap and sealed supply tightness — filterable by recent releases or any set.",
  alternates: { canonical: "/market" },
};

export default async function MarketPage({ searchParams }: { searchParams: { scope?: string } }) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const scope = scopeFromParam(searchParams.scope);
  const data = await getMarketIndex(country, scope);

  const d1 = changeOver(data.points, 1);
  const d7 = changeOver(data.points, 7);
  const d30 = changeOver(data.points, 30);
  const breadthTotal = data.risers + data.fallers + data.flat;
  const activeChip = searchParams.scope ?? "all";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold text-white">📈 The DexCompare Index</h1>
        <p className="mt-1 max-w-2xl text-slate-400">
          How the Pokémon card market is moving in {info.place} — built from our daily snapshots of the
          cheapest live {info.adjective} price for the {data.basketSize || "top"} most valuable cards
          {data.scopeLabel !== "All cards" ? ` in ${data.scopeLabel}` : ""}.
        </p>
      </header>

      {/* Scope selector — all / recent releases / newest sets. */}
      <div className="mb-5 flex flex-wrap gap-2">
        {scopeChips().map((c) => (
          <Link
            key={c.value}
            href={c.value === "all" ? "/market" : `/market?scope=${c.value}`}
            className={`chip border px-3 py-1.5 text-sm ${
              activeChip === c.value
                ? "border-brand-500 bg-brand-500/15 text-brand-300"
                : "border-ink-700 text-slate-300 hover:border-brand-500"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Market cap (tracked)" value={`≈ ${formatMoney(data.marketCapCents, "USD")}`} sub="sum of TCGplayer guides" />
        <Metric label={`Priced cards (${country})`} value={data.trackedCards.toLocaleString()} sub="with a live store price" />
        <Metric
          label="7-day breadth"
          value={breadthTotal ? `${data.risers}▲ / ${data.fallers}▼` : "—"}
          sub={breadthTotal ? `${data.flat} flat of ${breadthTotal} in basket` : "history building up"}
          tone={data.risers > data.fallers ? "up" : data.fallers > data.risers ? "down" : undefined}
        />
        <Metric
          label="Index (24h)"
          value={d1 == null ? "—" : `${d1 > 0 ? "+" : ""}${d1.toFixed(2)}%`}
          sub={d7 == null ? "more history soon" : `7d ${d7 > 0 ? "+" : ""}${d7.toFixed(1)}% · 30d ${d30 == null ? "—" : `${d30 > 0 ? "+" : ""}${d30.toFixed(1)}%`}`}
          tone={d1 == null ? undefined : d1 >= 0 ? "up" : "down"}
        />
      </div>

      {/* The index chart */}
      {data.points.length >= 2 ? (
        <PriceChart
          points={data.points}
          currency={info.currency}
          title={`${data.scopeLabel} index — combined basket value (${info.currency})`}
          note={`The ${data.basketSize} most valuable ${data.scopeLabel === "All cards" ? "" : `${data.scopeLabel} `}cards with history, cheapest live ${info.adjective} price, carried forward on quiet days.`}
        />
      ) : (
        <div className="card-surface mt-6 p-6 text-center text-sm text-slate-400">
          <p className="font-semibold text-white">The index is warming up</p>
          <p className="mt-1">
            We snapshot prices daily — the {data.scopeLabel.toLowerCase()} trend line appears once a few
            days of history exist for this scope. Check back tomorrow.
          </p>
        </div>
      )}

      <AdSlot slot={ADSENSE_SLOTS.browse} format="horizontal" height={90} className="mt-6" />

      {/* Movers inside the basket */}
      {(data.gainers.length > 0 || data.losers.length > 0) && (
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {data.gainers.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-extrabold text-white">📈 Biggest 7-day gainers</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {data.gainers.slice(0, 4).map((m) => (
                  <div key={m.card.id}>
                    <div className="mb-1 text-center text-xs font-bold text-emerald-400">▲ +{m.pct.toFixed(1)}%</div>
                    <CardTile card={m.card} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.losers.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-extrabold text-white">📉 Biggest 7-day fallers</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {data.losers.slice(0, 4).map((m) => (
                  <div key={m.card.id}>
                    <div className="mb-1 text-center text-xs font-bold text-red-400">▼ {m.pct.toFixed(1)}%</div>
                    <CardTile card={m.card} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sealed supply tightness — how camped are the newest sets? */}
      {data.sealed.length > 0 && (
        <section className="card-surface mt-8 overflow-hidden">
          <div className="border-b border-ink-700 p-4">
            <h2 className="font-bold text-white">📦 Sealed supply — newest sets</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Box/ETB listings in stock across {info.adjective} stores — low numbers mean a camped set.
            </p>
          </div>
          <ul className="divide-y divide-ink-800">
            {data.sealed.map((s) => {
              const pct = s.total ? Math.round((s.inStock / s.total) * 100) : 0;
              return (
                <li key={s.setCode} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{s.setName}</div>
                    <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded bg-ink-800">
                      <div
                        className={`h-full ${pct < 25 ? "bg-rose-500" : pct < 60 ? "bg-amber-400" : "bg-emerald-500"}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-white">{s.inStock}/{s.total} in stock</div>
                    <div className="text-[11px] text-slate-500">
                      {s.cheapestBoxCents != null ? `box from ${formatMoney(s.cheapestBoxCents, info.currency)}` : "boxes sold out"}
                    </div>
                  </div>
                  <Link href={`/sealed?q=${encodeURIComponent(s.setName)}`} className="btn-ghost shrink-0 text-xs">
                    Compare →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-600">
        Methodology: the index sums the cheapest live {info.adjective} price of the {data.basketSize || "top"}{" "}
        most valuable in-scope cards each day (last price carried forward on days without a snapshot). It
        reflects what the basket would cost to BUY today — not graded-sale or auction prices. Market cap is
        the sum of TCGplayer market guides across every tracked card.
      </p>
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="card-surface p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-extrabold ${tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
