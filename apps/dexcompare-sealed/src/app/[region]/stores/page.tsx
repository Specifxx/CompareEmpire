import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Ago } from "@/components/Ago";
import { storeStats } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { REGIONS, type Region } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { storeHost, storesInMarket } from "@/lib/stores";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { region: Region } }): Metadata {
  const r = REGIONS[params.region];
  if (!r) return {};
  const n = storesInMarket(r.market).length;
  return pageMeta({
    title: `${n} ${r.adjective} Pokémon TCG stores compared`,
    description: `The ${n} ${r.adjective} stores DexCompare checks for Pokémon sealed stock and prices, and how many products each has in stock.`,
    path: `/${r.region}/stores`,
    alternates: regionAlternates(r.region, "/stores"),
  });
}

export default async function StoresPage({ params }: { params: { region: Region } }) {
  const r = REGIONS[params.region];
  const stats = new Map((await storeStats(r.market)).map((s) => [s.store, s]));
  const stores = storesInMarket(r.market)
    .map((s) => ({ s, st: stats.get(s.key) }))
    .sort((a, b) => (b.st?.inStock ?? 0) - (a.st?.inStock ?? 0) || a.s.name.localeCompare(b.s.name));
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Stores" }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {stores.length} {r.adjective} stores we compare
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Independent game and card stores that sell Pokémon sealed product online in {r.currency}. We read their public product listings
        about twice a day. Run a store and want to be listed? <Link href="/about#stores" className="font-semibold text-brand">See how</Link>.
      </p>
      <div className="card mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1fr_7rem_7rem_9rem] gap-4 border-b border-line bg-raised px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-faint sm:grid">
          <span>Store</span>
          <span className="text-right">In stock</span>
          <span className="text-right">Listed</span>
          <span className="text-right">Last read</span>
        </div>
        <ul className="divide-y divide-line">
          {stores.map(({ s, st }) => (
            <li key={s.key}>
              <Link href={`/${r.region}/stores/${s.key}`} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-raised sm:grid-cols-[1fr_7rem_7rem_9rem] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-faint">{storeHost(s)}</span>
                </span>
                <span className="tabular text-right font-semibold text-open">{st?.inStock ?? 0}<span className="font-normal text-faint sm:hidden"> in stock</span></span>
                <span className="tabular hidden text-right text-muted sm:block">{st?.listed ?? 0}</span>
                <span className="hidden text-right text-xs text-faint sm:block">
                  {st?.lastOkAt ? <Ago iso={st.lastOkAt.toISOString()} initial={timeAgo(st.lastOkAt)} /> : "not yet"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
