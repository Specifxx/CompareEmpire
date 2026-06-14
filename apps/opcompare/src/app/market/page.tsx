import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { PriceChart, changeOver } from "@/components/PriceChart";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { getMarketIndex, scopeChips, scopeFromParam } from "@/lib/market-index";
import { getMarketWrap, latestWrapDay } from "@/lib/market-wrap";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// Per-request: the index is computed for the visitor's market (cookie).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "The OPCompare Index — One Piece Card Market Tracker | OPCompare" },
  description:
    "One number for the health of the One Piece Card Game singles market. The OPCompare Index tracks the most valuable cards as a daily base-100 index per market, with a global composite, breadth, movers and sealed supply. Updated daily, free to cite.",
  alternates: { canonical: "/market" },
};

function Delta({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null)
    return (
      <div className="rounded-lg bg-ink-900 px-3 py-2 text-center">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm font-extrabold text-slate-500">—</div>
      </div>
    );
  const up = pct > 0.005;
  const down = pct < -0.005;
  return (
    <div className="rounded-lg bg-ink-900 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-extrabold ${up ? "text-emerald-400" : down ? "text-red-400" : "text-slate-300"}`}>
        {up || down ? `${up ? "▲ +" : "▼ "}${pct.toFixed(2)}%` : "flat"}
      </div>
    </div>
  );
}

export default async function MarketPage({ searchParams }: { searchParams: { scope?: string } }) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const scope = scopeFromParam(searchParams.scope);
  const data = await getMarketIndex(country, scope);

  // THE INDEX NUMBER: the basket cost series rebased so the first recorded day
  // = 100 (a real index level, like any market index — "103.2" means the
  // watched basket is 3.2% dearer to buy than at the series start). The raw
  // cost chart below keeps the honest dollars.
  const base = data.points[0]?.cents ?? null;
  const latestCents = data.points[data.points.length - 1]?.cents ?? null;
  const indexLevel = base && latestCents ? (latestCents / base) * 100 : null;
  const d1 = changeOver(data.points, 1);
  const d7 = changeOver(data.points, 7);
  const d30 = changeOver(data.points, 30);
  const sinceStart = base && latestCents ? ((latestCents - base) / base) * 100 : null;
  const startDay = data.points[0] ? new Date(data.points[0].day).toISOString().slice(0, 10) : null;

  // GLOBAL composite (all four markets, equal-weighted matched-pair move) from
  // the Daily Market Wrap engine — one cached call, currency-neutral.
  const wrapDay = await latestWrapDay();
  const wrap = wrapDay ? await getMarketWrap(wrapDay) : null;

  const breadthTotal = data.risers + data.fallers + data.flat;
  const activeChip = searchParams.scope ?? "all";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "OPCompare Index", item: `${SITE_URL}/market` },
    ],
  };
  const datasetLd = startDay
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "The OPCompare Index",
        description: `Daily base-100 price index of the ${data.basketSize} most valuable One Piece Card Game cards per market, from live store prices. Base 100 on ${startDay}.`,
        url: `${SITE_URL}/market`,
        creator: { "@type": "Organization", name: "OPCompare", url: SITE_URL },
        license: `${SITE_URL}/market#cite`,
        temporalCoverage: `${startDay}/..`,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd ? [breadcrumbLd, datasetLd] : [breadcrumbLd]) }}
      />

      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">OPCompare Index</span>
      </nav>

      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold text-white">📈 The OPCompare Index</h1>
        <p className="mt-1 max-w-2xl text-slate-400">
          The One Piece singles market in one number: a base-100 index of the {data.basketSize || "top"} most
          valuable {data.scopeLabel !== "All cards" ? `${data.scopeLabel} ` : ""}cards, priced daily from the
          cheapest live {info.adjective} store listing. Switch country at the top for your market.
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

      {/* Headline index level + deltas */}
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {country} market{startDay ? ` · base 100 on ${startDay}` : ""}
            </div>
            <div className="font-display text-5xl font-extrabold text-white">
              {indexLevel != null ? indexLevel.toFixed(1) : "100.0"}
            </div>
            {wrap?.globalD1 != null && (
              <div className="mt-1 text-xs text-slate-400">
                Global composite (all 4 markets, {wrap.day}):{" "}
                <span className={wrap.globalD1 > 0.05 ? "font-bold text-emerald-400" : wrap.globalD1 < -0.05 ? "font-bold text-red-400" : "font-bold text-slate-300"}>
                  {wrap.globalD1 > 0 ? "+" : ""}{wrap.globalD1.toFixed(2)}%
                </span>{" "}
                · <Link href={`/blog/market-wrap/${wrap.day}`} className="text-brand-400 hover:underline">today&apos;s wrap →</Link>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Delta label="1 day" pct={d1} />
            <Delta label="7 days" pct={d7} />
            <Delta label="30 days" pct={d30} />
            <Delta label="All time" pct={sinceStart} />
          </div>
        </div>

        {data.points.length >= 2 ? (
          <div className="mt-4">
            <PriceChart
              points={data.points}
              currency={info.currency}
              title={`Basket cost — what the ${data.scopeLabel.toLowerCase()} basket costs to buy (${info.currency})`}
              note={`The ${data.basketSize} most valuable ${data.scopeLabel === "All cards" ? "" : `${data.scopeLabel} `}cards with history, cheapest live ${info.adjective} price, carried forward on quiet days. The index level above is this line rebased to 100.`}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-ink-900/60 p-5 text-center text-sm text-slate-400">
            <p className="font-semibold text-white">The trend line is warming up</p>
            <p className="mt-1">
              We snapshot prices daily — the {data.scopeLabel.toLowerCase()} line appears once two days of
              history exist for this scope. The level starts at 100.0 by definition.
            </p>
          </div>
        )}
      </section>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Market cap (tracked)" value={`≈ ${formatMoney(data.marketCapCents, "USD")}`} sub="sum of TCGplayer guides" />
        <Metric label={`Priced cards (${country})`} value={data.trackedCards.toLocaleString()} sub="with a live store price" />
        <Metric
          label="7-day breadth"
          value={breadthTotal ? `${data.risers}▲ / ${data.fallers}▼` : "—"}
          sub={breadthTotal ? `${data.flat} flat of ${breadthTotal} in basket` : "history building up"}
          tone={data.risers > data.fallers ? "up" : data.fallers > data.risers ? "down" : undefined}
        />
      </div>

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

      {/* Methodology + citing — press-ready, like any index publisher. */}
      <section id="cite" className="card-surface mt-8 space-y-3 p-5 text-sm leading-relaxed text-slate-400">
        <h2 className="text-lg font-extrabold text-white">Methodology &amp; citing the Index</h2>
        <p>
          The OPCompare Index tracks what the {data.basketSize || "top"} most valuable in-scope One Piece
          cards would cost to BUY today: each day we record the cheapest live in-stock price per card in
          each market (NM/LP conditions; market-guide estimates excluded), sum the basket, and rebase the
          series to 100 at its start — an index of 103 means the basket is 3% dearer than at the start.
          Days without a snapshot carry the last price forward, so the line only moves when prices move.
          It reflects retail ask prices, not graded sales or auctions. Market cap is the sum of TCGplayer
          market guides across every tracked card. The global composite is the equal-weighted average of
          the four markets&apos; matched-pair daily moves — currency-neutral by construction.
        </p>
        <p className="text-slate-300">
          <strong>Citing the Index:</strong> journalists and creators are welcome to quote it freely as
          &ldquo;the OPCompare Index&rdquo; with a link to this page. The{" "}
          <Link href="/blog/market-wrap" className="text-brand-400 hover:underline">Daily Market Wrap</Link>{" "}
          publishes the full daily breakdown.
        </p>
      </section>
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
