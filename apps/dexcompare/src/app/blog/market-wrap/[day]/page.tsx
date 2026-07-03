import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketWrap, wrapDays } from "@/lib/market-wrap";
import { COUNTRIES, type Country } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

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
                <h3 className="mb-2 text-sm font-bold text-emerald-400">▲ Gainers</h3>
                <ul className="space-y-2 text-sm">
                  {wrap.insight.gainers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <Link href={`/card/${m.slug ?? m.id}`} className="min-w-0 truncate text-slate-200 hover:text-brand-400">
                        {m.name} <span className="text-slate-500">({m.setCode.toUpperCase()})</span>
                      </Link>
                      <span className="shrink-0 font-bold text-emerald-400">{pct(m.pct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {wrap.insight.losers.length > 0 && (
              <div className="card-surface p-4">
                <h3 className="mb-2 text-sm font-bold text-red-400">▼ Fallers</h3>
                <ul className="space-y-2 text-sm">
                  {wrap.insight.losers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <Link href={`/card/${m.slug ?? m.id}`} className="min-w-0 truncate text-slate-200 hover:text-brand-400">
                        {m.name} <span className="text-slate-500">({m.setCode.toUpperCase()})</span>
                      </Link>
                      <span className="shrink-0 font-bold text-red-400">{pct(m.pct)}</span>
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
