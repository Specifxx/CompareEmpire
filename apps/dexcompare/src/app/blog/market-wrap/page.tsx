import type { Metadata } from "next";
import Link from "next/link";
import { latestWrapDay, wrapDays } from "@/lib/market-wrap";

// ISR, not force-dynamic: the wrap data is already unstable_cache'd (30 min)
// and a new edition only appears once a day (after the 04:30 Sydney price
// refresh) — per-request rendering just added click lag for nothing.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Daily Market Wrap — how the Pokémon card market moved",
  description:
    "An automated daily report on the Pokémon singles market: the DexCompare Global Index move, every market's day, and the cards that drove it — generated from real store-price snapshots.",
  alternates: { canonical: "/blog/market-wrap" },
};

// Stable edition index (NOT a redirect — a sitemap URL that redirects becomes
// "Page with redirect" noise in Search Console). Lists every edition, with the
// latest up top; until two snapshot days exist it explains when the first
// edition lands.
export default async function MarketWrapIndex() {
  const latest = await latestWrapDay();
  const days = await wrapDays();
  // Editions = every day with a predecessor, newest first.
  const editions = days.slice(1).reverse();

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-400">Daily Market Wrap</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-white">
        The Pokémon market, every day
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        An automated daily report built from DexCompare&apos;s store-price snapshots: the Global Index
        move, how each market traded, and the cards that drove it. A new edition publishes after every
        daily price refresh.
      </p>

      {latest ? (
        <>
          <Link
            href={`/blog/market-wrap/${latest}`}
            className="card-surface mt-6 flex items-center justify-between gap-3 border-l-2 border-l-brand-500 p-4 transition-colors hover:border-ink-600"
          >
            <span className="font-bold text-white">Today&apos;s edition — {latest}</span>
            <span className="shrink-0 text-sm font-semibold text-brand-400">Read →</span>
          </Link>
          {editions.length > 1 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Previous editions
              </h2>
              <ul className="card-surface divide-y divide-ink-800">
                {editions.slice(1).map((d) => (
                  <li key={d}>
                    <Link
                      href={`/blog/market-wrap/${d}`}
                      className="block px-4 py-2.5 text-sm text-slate-200 hover:bg-ink-800 hover:text-white"
                    >
                      Market Wrap — {d}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="card-surface mt-6 p-5 text-sm leading-relaxed text-slate-300">
          {days.length === 1 ? (
            <>
              The baseline snapshot was recorded on <strong className="text-white">{days[0]}</strong> —
              the first edition publishes after the next daily price refresh.
            </>
          ) : (
            <>The first snapshot hasn&apos;t been recorded yet — check back after the next daily price refresh.</>
          )}
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link href="/market" className="text-brand-400 hover:underline">
          The live DexCompare Index →
        </Link>
      </p>
    </div>
  );
}
