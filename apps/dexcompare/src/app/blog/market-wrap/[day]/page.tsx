import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketWrap, wrapDays } from "@/lib/market-wrap";
import { getGlobalIndex } from "@/lib/market-index";
import { COUNTRIES, type Country } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { BreadthBar, DeltaChip, DivergingBar, IndexAreaChart, type SeriesPoint } from "@/components/WrapCharts";

// ISR, not force-dynamic: a past day's wrap is immutable and the underlying
// data is unstable_cache'd — cache the page so the "Read" click is instant.
export const revalidate = 3600;

const VALID_DAY = /^\d{4}-\d{2}-\d{2}$/;

function longDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({ params }: { params: { day: string } }): Promise<Metadata> {
  if (!VALID_DAY.test(params.day)) notFound(); // real 404 — metadata resolves before streaming
  const wrap = await getMarketWrap(params.day);
  if (!wrap) notFound();
  return {
    title: `${wrap.headline} — Market Wrap, ${longDate(wrap.day)}`,
    description: wrap.lede,
    alternates: { canonical: `/blog/market-wrap/${wrap.day}` },
    // Dated editions are template-generated (numeric deltas + one machine
    // sentence) — thin near-duplicates at ~30 URLs, a helpful-content risk.
    // Keep them crawlable for readers arriving via the hub, but out of the
    // index; the /blog/market-wrap hub (always showing the latest wrap) is the
    // indexable surface for this content.
    robots: { index: false, follow: true },
  };
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const tone = (v: number) => (v > 0.05 ? "text-emerald-400" : v < -0.05 ? "text-red-400" : "text-slate-300");

export default async function MarketWrapDayPage({ params }: { params: { day: string } }) {
  if (!VALID_DAY.test(params.day)) notFound();
  const wrap = await getMarketWrap(params.day);
  if (!wrap) notFound();

  const days = await wrapDays();
  const i = days.indexOf(wrap.day);
  const prev = i > 1 ? days[i - 1] : null; // previous day needs its own predecessor to have a wrap
  const next = i >= 0 && i < days.length - 1 ? days[i + 1] : null;

  // Global index level up to (and including) this wrap's day — the hero chart.
  // Cached (unstable_cache, 30 min) and gracefully empty while history is young.
  const indexSeries: SeriesPoint[] = await getGlobalIndex({ kind: "all" })
    .then((idx) =>
      idx.points
        .map((p) => ({ d: p.day.toISOString().slice(0, 10), v: p.cents / 100 }))
        .filter((p) => p.d <= wrap.day)
        .slice(-30)
    )
    .catch(() => []);

  // Aggregate breadth across all markets with data (matched-pair comparisons).
  const breadth = wrap.markets.reduce(
    (acc, m) => {
      if (m.d1 == null) return acc;
      acc.rose += m.risers;
      acc.fell += m.fallers;
      acc.flat += Math.max(m.paired - m.risers - m.fallers, 0);
      return acc;
    },
    { rose: 0, fell: 0, flat: 0 }
  );

  // Shared axes so bars are comparable within each chart.
  const marketScale = Math.max(...wrap.markets.map((m) => Math.abs(m.d1 ?? 0)), 0.1);
  const moverScale = wrap.insight
    ? Math.max(...[...wrap.insight.gainers, ...wrap.insight.losers].map((m) => Math.abs(m.pct)), 0.1)
    : 1;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${wrap.headline} — DexCompare Daily Market Wrap`,
    description: wrap.lede,
    datePublished: wrap.day,
    dateModified: wrap.day,
    author: { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "DexCompare", url: SITE_URL },
    publisher: { "@type": "Organization", name: "DexCompare", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/market-wrap/${wrap.day}`,
  };

  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/blog" className="hover:text-slate-300">Blog</Link>
        <span>/</span>
        <Link href="/blog/market-wrap" className="hover:text-slate-300">Daily Market Wrap</Link>
        <span>/</span>
        <span className="text-slate-300">{wrap.day}</span>
      </nav>

      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-400">Daily Market Wrap</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-white">{wrap.headline}</h1>
      <p className="mt-2 text-xs text-slate-500">
        {longDate(wrap.day)} · generated automatically from DexCompare&apos;s daily store-price snapshots
        ({wrap.prevDay} → {wrap.day})
      </p>

      <p className="mt-5 text-base leading-relaxed text-slate-300">{wrap.lede}</p>

      {/* Key numbers */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-surface p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Global index (1d)</div>
          <div className={`mt-0.5 text-xl font-extrabold ${tone(wrap.globalD1 ?? 0)}`}>
            {wrap.globalD1 == null ? "—" : pct(wrap.globalD1)}
          </div>
        </div>
        <div className="card-surface p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Markets up / down</div>
          <div className="mt-0.5 text-xl font-extrabold text-white">
            {wrap.marketsUp} <span className="text-emerald-400">▲</span> / {wrap.marketsDown}{" "}
            <span className="text-red-400">▼</span>
          </div>
        </div>
        <div className="card-surface p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Markets tracked</div>
          <div className="mt-0.5 text-xl font-extrabold text-white">{wrap.marketsWithData}</div>
        </div>
        <div className="card-surface p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hardest mover</div>
          <div className="mt-0.5 text-xl font-extrabold text-white">
            {wrap.insight ? `${wrap.insight.country} ${pct(wrap.insight.d1)}` : "—"}
          </div>
        </div>
      </div>

      {/* Hero chart: the global index into this session */}
      {indexSeries.length >= 2 && (
        <section className="mt-8">
          <div className="card-surface p-4 sm:p-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                DexCompare Global Index — last {indexSeries.length} sessions
              </h2>
              <DeltaChip pct={wrap.globalD1} />
            </div>
            <IndexAreaChart
              series={indexSeries}
              id="wrap-index"
              ariaLabel={`DexCompare Global Index level over the last ${indexSeries.length} sessions, ending ${wrap.day}`}
            />
          </div>
        </section>
      )}

      {/* Markets at a glance: zero-centred diverging bars on a shared axis */}
      <section className="mt-8">
        <h2 className="mb-2 text-xl font-extrabold text-white">Markets at a glance</h2>
        <div className="card-surface space-y-2.5 p-4">
          {wrap.markets.map((m) => {
            const info = COUNTRIES[m.country as Country];
            return (
              <div key={m.country} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-semibold text-white sm:w-32">{info.place}</span>
                <DivergingBar pct={m.d1} scale={marketScale} />
                <span className="w-20 shrink-0 text-right">
                  <DeltaChip pct={m.d1} />
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Market breadth */}
      {breadth.rose + breadth.fell + breadth.flat > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-extrabold text-white">Market breadth</h2>
          <div className="card-surface p-4">
            <BreadthBar rose={breadth.rose} fell={breadth.fell} flat={breadth.flat} />
            <p className="mt-2 text-[11px] text-slate-600">
              Matched-pair card comparisons across all markets with data ({wrap.prevDay} → {wrap.day}).
            </p>
          </div>
        </section>
      )}

      {/* Per-market table */}
      <section className="mt-8">
        <h2 className="mb-2 text-xl font-extrabold text-white">Around the markets</h2>
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Market</th>
                <th className="px-2 py-2.5 text-right font-semibold">1-day</th>
                <th className="px-2 py-2.5 text-right font-semibold">Risers / fallers</th>
                <th className="px-2 py-2.5 text-right font-semibold">Cards compared</th>
                <th className="px-4 py-2.5 text-right font-semibold">Basket cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {wrap.markets.map((m) => {
                const info = COUNTRIES[m.country as Country];
                return (
                  <tr key={m.country}>
                    <td className="px-4 py-2.5 font-semibold text-white">{info.place}</td>
                    <td className={`px-2 py-2.5 text-right font-bold ${m.d1 == null ? "text-slate-500" : tone(m.d1)}`}>
                      {m.d1 == null ? "no data" : pct(m.d1)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-300">
                      {m.d1 == null ? "—" : `${m.risers.toLocaleString()} / ${m.fallers.toLocaleString()}`}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-400">
                      {m.paired ? m.paired.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">
                      {m.basketCents == null ? "—" : formatMoney(m.basketCents, info.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600">
          Each market&apos;s move compares the same cards across both snapshot days (matched pairs), priced at the
          cheapest in-stock store listing in local currency — so catalogue changes can&apos;t fake a move.
        </p>
      </section>

      {/* Regional insight */}
      {wrap.insight && (wrap.insight.gainers.length > 0 || wrap.insight.losers.length > 0) && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-extrabold text-white">
            Spotlight: {COUNTRIES[wrap.insight.country as Country].place}
          </h2>
          <p className="mb-3 text-sm text-slate-400">
            The {pct(wrap.insight.d1)} session was the day&apos;s biggest move. The cards driving it:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {wrap.insight.gainers.length > 0 && (
              <div className="card-surface p-4">
                <h3 className="mb-3 text-sm font-bold text-emerald-400">▲ Gainers</h3>
                <ul className="space-y-2.5 text-sm">
                  {wrap.insight.gainers.map((m) => (
                    <li key={m.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Link href={`/card/${m.slug ?? m.id}`} className="min-w-0 truncate text-slate-200 hover:text-brand-400">
                          {m.name} <span className="text-slate-500">({m.setCode.toUpperCase()})</span>
                        </Link>
                        <span className="shrink-0"><DeltaChip pct={m.pct} /></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DivergingBar pct={m.pct} scale={moverScale} />
                        <span className="num shrink-0 text-[11px] text-slate-500">
                          {formatMoney(m.fromCents, COUNTRIES[wrap.insight!.country as Country].currency)} → {formatMoney(m.toCents, COUNTRIES[wrap.insight!.country as Country].currency)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {wrap.insight.losers.length > 0 && (
              <div className="card-surface p-4">
                <h3 className="mb-3 text-sm font-bold text-red-400">▼ Fallers</h3>
                <ul className="space-y-2.5 text-sm">
                  {wrap.insight.losers.map((m) => (
                    <li key={m.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Link href={`/card/${m.slug ?? m.id}`} className="min-w-0 truncate text-slate-200 hover:text-brand-400">
                          {m.name} <span className="text-slate-500">({m.setCode.toUpperCase()})</span>
                        </Link>
                        <span className="shrink-0"><DeltaChip pct={m.pct} /></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DivergingBar pct={m.pct} scale={moverScale} />
                        <span className="num shrink-0 text-[11px] text-slate-500">
                          {formatMoney(m.fromCents, COUNTRIES[wrap.insight!.country as Country].currency)} → {formatMoney(m.toCents, COUNTRIES[wrap.insight!.country as Country].currency)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Prev / next + cross-links */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-4 text-sm">
        <div>{prev && <Link href={`/blog/market-wrap/${prev}`} className="text-brand-400 hover:underline">← {prev}</Link>}</div>
        <Link href="/market" className="text-brand-400 hover:underline">Full DexCompare Index →</Link>
        <div>{next && <Link href={`/blog/market-wrap/${next}`} className="text-brand-400 hover:underline">{next} →</Link>}</div>
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-slate-600">
        Methodology: this report is generated automatically each day from DexCompare&apos;s store-price snapshots —
        the cheapest in-stock listing per card per market (NM/LP conditions, market-guide estimates excluded). The
        global index is the equal-weighted average of the four markets&apos; matched-pair basket moves. It reflects
        retail ask prices, not sales; nothing here is financial advice.
      </p>
    </article>
  );
}
