import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { latestWrapDay, wrapDays } from "@/lib/market-wrap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Market Wrap — how the Pokémon card market moved today",
  description:
    "An automated daily report on the Pokémon singles market: the DexCompare Global Index move, every market's day, and the cards that drove it — generated from real store-price snapshots.",
  alternates: { canonical: "/blog/market-wrap" },
};

// /blog/market-wrap → today's (latest computable) wrap. Until two snapshot
// days exist, explain when the first edition lands instead of 404ing.
export default async function MarketWrapLatest() {
  const latest = await latestWrapDay();
  if (latest) redirect(`/blog/market-wrap/${latest}`);

  const days = await wrapDays(3);
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-400">Daily Market Wrap</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-white">First edition coming up</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        The Daily Market Wrap compares each day&apos;s store-price snapshot with the previous one
        {days.length === 1 ? (
          <> — the baseline snapshot was recorded on <strong className="text-white">{days[0]}</strong>, so the first
          edition publishes after the next snapshot lands.</>
        ) : (
          <> — the first snapshot hasn&apos;t been recorded yet. Check back after the next daily price refresh.</>
        )}
      </p>
      <p className="mt-4 text-sm">
        <Link href="/market" className="text-brand-400 hover:underline">
          The DexCompare Index is live now →
        </Link>
      </p>
    </div>
  );
}
