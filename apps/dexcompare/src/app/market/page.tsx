import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import {
  ALL_INDEX_KEYS,
  MARKET_INDEX_KEYS,
  ERA_INDEX_KEYS,
  INDEX_LABELS,
  selectConstituents,
  readIndexSeries,
  computeIndexStats,
  type IndexKey,
} from "@/lib/market-index";
import { IndexChart } from "@/components/IndexChart";
import { EmbedSnippet } from "@/components/EmbedSnippet";

export const revalidate = 3600;

function isIndexKey(v: string | undefined): v is IndexKey {
  return !!v && (ALL_INDEX_KEYS as string[]).includes(v);
}

export async function generateMetadata({ searchParams }: { searchParams: { index?: string } }): Promise<Metadata> {
  const key: IndexKey = isIndexKey(searchParams.index) ? searchParams.index : "GLOBAL";
  const title = `${INDEX_LABELS[key]} — Live Pokémon Card Market Index`;
  const description = `A search-weighted basket of up to 500 Pokémon cards, tracked daily. See where the ${SITE_NAME} Index stands, its constituents, and full methodology.`;
  return {
    title,
    description,
    alternates: { canonical: `/market${key === "GLOBAL" ? "" : `?index=${key}`}` },
    openGraph: { title, description, url: `${SITE_URL}/market` },
  };
}

const TABS = ["index", "constituents", "movers", "methodology"] as const;
type Tab = (typeof TABS)[number];

export default async function MarketPage({ searchParams }: { searchParams: { index?: string; tab?: string; page?: string } }) {
  const key: IndexKey = isIndexKey(searchParams.index) ? searchParams.index : "GLOBAL";
  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as Tab) : "index";

  const [series, constituents] = await Promise.all([readIndexSeries(key, 730), selectConstituents(key)]);
  const stats = computeIndexStats(series);

  const avgCents = constituents.length ? constituents.reduce((s, c) => s + c.priceCents, 0) / constituents.length : null;
  const sortedPrices = [...constituents].map((c) => c.priceCents).sort((a, b) => a - b);
  const medianCents = sortedPrices.length
    ? sortedPrices.length % 2
      ? sortedPrices[(sortedPrices.length - 1) / 2]
      : (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
    : null;
  const basketCents = stats.latest?.basketCents ?? (constituents.length ? Math.round(constituents.reduce((s, c) => s + c.priceCents * c.weight, 0)) : null);

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const PAGE_SIZE = 50;
  const pagedConstituents = constituents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(constituents.length / PAGE_SIZE));

  const collection = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: INDEX_LABELS[key],
    description: `Daily search-weighted Pokémon TCG price index, ${constituents.length} constituents.`,
    url: `${SITE_URL}/market`,
    creator: { "@type": "Organization", name: SITE_NAME },
  };

  const tabHref = (t: Tab) => `/market?index=${key}${t === "index" ? "" : `&tab=${t}`}`;
  const indexHref = (k: IndexKey) => `/market?index=${k}${tab === "index" ? "" : `&tab=${tab}`}`;

  return (
    <div className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />

      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{SITE_NAME} Index</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          A search-weighted basket of up to 500 Pokémon cards, snapshotted daily. No fabricated price history — the
          index tracks its own value over time; the constituent table below is always today&apos;s live prices.
          Journalists and creators are welcome to quote this with a link back.
        </p>
      </div>

      {/* Index switcher */}
      <div className="flex flex-wrap gap-2">
        {MARKET_INDEX_KEYS.map((k) => (
          <Link key={k} href={indexHref(k)} className={`chip border px-3 py-1.5 text-sm ${key === k ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"}`}>
            {INDEX_LABELS[k]}
          </Link>
        ))}
        {ERA_INDEX_KEYS.map((k) => (
          <Link key={k} href={indexHref(k)} className={`chip border px-3 py-1.5 text-sm ${key === k ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"}`}>
            {INDEX_LABELS[k]}
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-800">
        {TABS.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${tab === t ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "index" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Basket value" value={basketCents != null ? formatMoney(basketCents, "USD") : "—"} />
            <Stat label="Average card" value={avgCents != null ? formatMoney(avgCents, "USD") : "—"} />
            <Stat label="Median card" value={medianCents != null ? formatMoney(medianCents, "USD") : "—"} />
            <Stat label="Constituents" value={String(constituents.length)} />
            <Stat label="All-time change" value={stats.changePct != null ? `${stats.changePct >= 0 ? "+" : ""}${stats.changePct.toFixed(1)}%` : "—"} />
            <Stat label="Range" value={stats.rangeLow != null ? `${stats.rangeLow.toFixed(0)}–${stats.rangeHigh?.toFixed(0)}` : "—"} />
            <Stat label="Breadth (30d)" value={stats.breadthPct != null ? `${stats.breadthPct.toFixed(0)}% up days` : "—"} />
            <Stat label="Volatility (30d)" value={stats.volatility30d != null ? `${stats.volatility30d.toFixed(2)}%` : "—"} />
          </div>
          <div className="card-surface p-4">
            <IndexChart points={series.map((p) => ({ day: p.day, value: p.value }))} />
          </div>
        </>
      )}

      {tab === "constituents" && (
        <div>
          <p className="mb-3 text-xs text-slate-500">
            Live current price and weight for every constituent — no per-card change columns (this app stores no
            per-card price history; see Methodology).
          </p>
          <div className="card-surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-800 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Card</th><th className="px-4 py-2">Set</th><th className="px-4 py-2 text-right">Price</th><th className="px-4 py-2 text-right">Weight</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {pagedConstituents.map((c) => (
                  <tr key={c.cardId}>
                    <td className="px-4 py-2">
                      <Link href={`/card/${c.slug ?? c.cardId}`} className="font-semibold text-white hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{c.setName} · {c.collectorNumber}</td>
                    <td className="num px-4 py-2 text-right text-white">{formatMoney(c.priceCents, "USD")}</td>
                    <td className="num px-4 py-2 text-right text-slate-400">{(c.weight * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link href={`/market?index=${key}&tab=constituents&page=${page - 1}`} className="btn-ghost text-sm">← Previous</Link>}
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              {page < totalPages && <Link href={`/market?index=${key}&tab=constituents&page=${page + 1}`} className="btn-ghost text-sm">Next →</Link>}
            </div>
          )}
        </div>
      )}

      {tab === "movers" && (
        <div className="card-surface p-6">
          <h2 className="font-bold text-white">Movers isn&apos;t available yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Per-card movers needs a per-card price time series, and this app deliberately doesn&apos;t store one — at
            20k+ cards × multiple markets, that&apos;s tens of millions of rows a year. The table below shows the
            columns this view is designed to support, ready to populate without a rewrite if a small, bounded daily
            snapshot of just the {constituents.length} index constituents (not the full catalogue) is ever approved.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-ink-800 opacity-50">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-800 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Card</th><th className="px-4 py-2 text-right">1d change</th><th className="px-4 py-2 text-right">7d change</th></tr>
              </thead>
              <tbody><tr><td className="px-4 py-3 text-slate-600" colSpan={3}>Not available — see above</td></tr></tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "methodology" && (
        <div className="card-surface space-y-4 p-6 text-sm leading-relaxed text-slate-300">
          <h2 className="font-bold text-white">Methodology</h2>
          <p>
            The {SITE_NAME} Index tracks a basket of up to 500 Pokémon cards, selected daily by search + view demand
            on {SITE_NAME} (the same demand signal used to prioritise our own price-checking). Each constituent&apos;s
            weight is its share of total basket demand, capped at 2% per card so no single chase card can dominate
            the index.
          </p>
          <p>
            <strong className="text-white">What&apos;s persisted:</strong> one row per index (global, AU, US, UK, and
            three era sub-indices) per day — the basket&apos;s aggregate value only. We do not store a price history
            for any individual card. The constituent table you see is always computed live from current prices; the
            chart is built entirely from these daily aggregate snapshots.
          </p>
          <p>
            <strong className="text-white">Era sub-indices:</strong> Vintage/WOTC covers sets released 2003 or
            earlier; Current Era is the newest shipping set series; Modern is everything in between.
          </p>
          <p>
            <strong className="text-white">Breadth</strong> measures the % of the last 30 daily snapshots where the
            index itself rose day-over-day — an index-level advance/decline measure, not a per-constituent one (we
            don&apos;t have per-constituent history to compute the latter).
          </p>
          <p>
            <strong className="text-white">Volatility (30d)</strong> is the standard deviation of daily % changes in
            the index value over the last 30 stored snapshots.
          </p>
          <p>
            <strong className="text-white">For journalists and creators:</strong> you&apos;re welcome to quote and
            chart the {SITE_NAME} Index with a link back to this page.
          </p>
          <div>
            <h3 className="mb-2 font-semibold text-white">Embed this index</h3>
            <EmbedSnippet title={INDEX_LABELS[key]} src={`${SITE_URL}/embed/market?index=${key}`} width={280} height={110} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="num mt-0.5 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
