import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney, dollarsToCents } from "@/lib/format";
import { PULL_RATE_SETS, pullRateSetForSeries } from "@/lib/box-ev";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

// `cost` is a free-text number the visitor types, so ?cost= has unbounded
// cardinality — a classic crawl trap. Any set/cost permutation is noindexed
// and canonicalised back to the bare calculator.
export function generateMetadata({ searchParams }: { searchParams: { set?: string; cost?: string } }): Metadata {
  const isPermutation = Boolean(searchParams.set || searchParams.cost);
  return {
    title: "Booster Box EV Calculator — Is It Worth Opening? | DexCompare",
    description:
      "Is it worth opening a Pokémon booster box? Estimate expected value from community pull-rate data and today's live card prices, per set.",
    alternates: { canonical: "/tools/box-ev" },
    ...(isPermutation ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: "Booster Box EV Calculator", url: `${SITE_URL}/tools/box-ev` },
  };
}

const eligibleSets = POKEMON_SETS.filter((s) => pullRateSetForSeries(s.series));

export default async function BoxEvPage({ searchParams }: { searchParams: { set?: string; cost?: string } }) {
  const set = eligibleSets.find((s) => s.code === searchParams.set) ?? eligibleSets[0] ?? null;
  const costCents = searchParams.cost ? dollarsToCents(searchParams.cost) : null;
  const pullSet = set ? pullRateSetForSeries(set.series) : null;

  let breakdown: { rarity: string; avgPerBox: number; avgPriceCents: number | null; contributionCents: number }[] = [];
  let evCents: number | null = null;

  if (set && pullSet) {
    const rarities = [...new Set(pullSet.rates.map((r) => r.rarity))];
    const rows = await prisma.card.groupBy({
      by: ["rarity"],
      where: { setCode: set.code, rarity: { in: rarities }, lowestPriceCents: { not: null } },
      _avg: { lowestPriceCents: true },
    });
    const avgByRarity = new Map(rows.map((r) => [r.rarity, r._avg.lowestPriceCents]));

    breakdown = pullSet.rates
      .filter((r) => avgByRarity.has(r.rarity))
      .map((r) => {
        const avgPriceCents = avgByRarity.get(r.rarity) ?? null;
        const contributionCents = avgPriceCents != null ? Math.round(avgPriceCents * r.avgPerBox) : 0;
        return { rarity: r.rarity, avgPerBox: r.avgPerBox, avgPriceCents, contributionCents };
      });
    const totalValueCents = breakdown.reduce((s, b) => s + b.contributionCents, 0);
    evCents = costCents != null ? totalValueCents - costCents : totalValueCents;
  }

  const fmt = (c: number) => formatMoney(c, "AUD");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">📦 Booster Box EV Calculator</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Is it worth opening a booster box, or better to buy singles? Estimated from community pull-rate data
          {pullSet && (
            <>
              {" "}(
              <a href={pullSet.source.url} target="_blank" rel="nofollow noopener noreferrer" className="text-brand-400 hover:underline">
                {pullSet.source.label}
              </a>
              )
            </>
          )}{" "}
          and today&apos;s live average card prices per rarity. Pull rates aren&apos;t official Pokémon Company data —
          treat this as a ballpark, not a guarantee.
        </p>
      </div>

      <form method="get" className="card-surface mb-6 flex flex-wrap items-end gap-4 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Set</span>
          <select name="set" defaultValue={set?.code} className="input">
            {eligibleSets.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Box cost (AUD)</span>
          <input name="cost" type="number" step="0.01" min="0" defaultValue={searchParams.cost ?? ""} placeholder="150.00" className="input w-32" />
        </label>
        <button type="submit" className="btn-primary">Calculate</button>
      </form>

      {!pullSet ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          Pull-rate data isn&apos;t available for this set&apos;s era yet — only {PULL_RATE_SETS.map((p) => p.label).join(", ")} is supported today.
        </div>
      ) : breakdown.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          Not enough priced cards in {set?.name} yet to estimate a box value.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Estimated box value" value={fmt(breakdown.reduce((s, b) => s + b.contributionCents, 0))} highlight />
            {costCents != null && <Stat label="Box cost" value={fmt(costCents)} />}
            {evCents != null && costCents != null && (
              <Stat label="Expected value" value={`${evCents >= 0 ? "+" : ""}${fmt(evCents)}`} sentiment={evCents >= 0 ? "up" : "down"} />
            )}
          </div>
          <div className="card-surface mt-4 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-800 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Rarity</th><th className="px-4 py-2 text-right">Avg per box</th><th className="px-4 py-2 text-right">Avg card price</th><th className="px-4 py-2 text-right">Contribution</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {breakdown.map((b) => (
                  <tr key={b.rarity}>
                    <td className="px-4 py-2 text-slate-300">{b.rarity}</td>
                    <td className="num px-4 py-2 text-right text-slate-400">{b.avgPerBox.toFixed(2)}</td>
                    <td className="num px-4 py-2 text-right text-slate-400">{b.avgPriceCents != null ? fmt(b.avgPriceCents) : "—"}</td>
                    <td className="num px-4 py-2 text-right font-semibold text-white">{fmt(b.contributionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight, sentiment }: { label: string; value: string; highlight?: boolean; sentiment?: "up" | "down" }) {
  const color = sentiment === "up" ? "text-up" : sentiment === "down" ? "text-down" : highlight ? "text-accent" : "text-white";
  return (
    <div className="card-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num mt-0.5 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
