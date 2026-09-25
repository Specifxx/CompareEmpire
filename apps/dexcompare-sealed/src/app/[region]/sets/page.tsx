import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { setCounts } from "@/lib/data";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { REGIONS, type Region } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { SERIES_ORDER, SETS } from "@/lib/sets";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { region: Region } }): Metadata {
  const r = REGIONS[params.region];
  if (!r) return {};
  return pageMeta({
    title: `Pokémon TCG sets — sealed product in ${r.name}`,
    description: `Browse Pokémon TCG sets from Mega Evolution back to XY and compare their booster boxes, ETBs and bundles across ${r.adjective} stores.`,
    path: `/${r.region}/sets`,
    alternates: regionAlternates(r.region, "/sets"),
  });
}

export default async function SetsPage({ params }: { params: { region: Region } }) {
  const r = REGIONS[params.region];
  const counts = await setCounts(r.market);
  const series = SERIES_ORDER.map((name) => ({ name, sets: SETS.filter((s) => s.series === name && counts.has(s.code)) })).filter((g) => g.sets.length);
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Sets" }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pokémon TCG sets</h1>
      <p className="mt-2 max-w-2xl text-muted">Sealed product {r.adjective} stores list for each set, newest first.</p>
      {series.map((g) => (
        <section key={g.name} className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold">{g.name}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.sets.map((s) => {
              const c = counts.get(s.code)!;
              const pre = isPreorderSet(s.code);
              return (
                <Link key={s.code} href={`/${r.region}/sets/${s.slug}`} className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-lift">
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center">
                    {s.logo ? (
                      <img src={s.logo} alt="" loading="lazy" className="max-h-14 max-w-24 object-contain" />
                    ) : (
                      <span className="font-display text-sm font-bold text-faint">{s.name}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold group-hover:text-brand">{s.name}</div>
                    <div className="text-xs text-faint">
                      {pre ? "Releases" : "Released"} {formatRelease(s.releaseDate)}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {c.products} products ·{" "}
                      <span className={c.inStock ? `font-semibold ${pre ? "text-pre" : "text-open"}` : ""}>
                        {c.inStock} {pre ? "open for pre-order" : "in stock"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
