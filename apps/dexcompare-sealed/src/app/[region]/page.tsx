import Link from "next/link";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductCard";
import { SearchBox } from "@/components/SearchBox";
import { Empty, Section } from "@/components/Section";
import { homeRails, regionOverview } from "@/lib/data";
import { money, plural, timeAgo } from "@/lib/format";
import { isPreorderSet, formatRelease } from "@/lib/release";
import { REGIONS, type Region } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { PRODUCT_TYPES } from "@/lib/sealed-title";
import { SETS } from "@/lib/sets";
import { storesInMarket } from "@/lib/stores";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { region: Region } }): Metadata {
  const r = REGIONS[params.region];
  if (!r) return {};
  const n = storesInMarket(r.market).length;
  return pageMeta({
    title: `Pokémon sealed prices & stock in ${r.name}`,
    description: `Compare Pokémon TCG booster boxes, Elite Trainer Boxes, bundles and collections across ${n} ${r.adjective} stores. Live stock, prices in ${r.currency}, and restock alerts.`,
    path: `/${r.region}`,
    alternates: regionAlternates(r.region, ""),
  });
}

const QUICK_TYPES = ["booster-boxes", "elite-trainer-boxes", "booster-bundles", "collections", "ultra-premium-collections", "tins", "booster-packs", "blisters"];

export default async function RegionHome({ params }: { params: { region: Region } }) {
  const r = REGIONS[params.region];
  const [{ boxes, etbs, preorders, latestSets: bySet }, overview] = await Promise.all([homeRails(r.market), regionOverview(r.market)]);
  const storeCount = storesInMarket(r.market).length;
  const latestSets = SETS.filter((s) => bySet.has(s.code)).slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-spark/15 blur-3xl" />
        <div className="page relative py-12 sm:py-16">
          <div className="eyebrow">
            <span aria-hidden="true">{r.flag}</span> {r.name} · prices in {r.currency}
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Pokémon sealed, <span className="text-brand">in stock</span>, at the best price.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Booster boxes, Elite Trainer Boxes, bundles and collections compared across {plural(storeCount, `${r.adjective} store`)}.
            Stock is checked twice a day — set an alert and we&rsquo;ll email you when something restocks.
          </p>
          <div className="mt-7 max-w-2xl">
            <SearchBox region={r.region} size="lg" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_TYPES.map((slug) => {
              const t = PRODUCT_TYPES.find((x) => x.slug === slug)!;
              return (
                <Link key={slug} href={`/${r.region}/type/${slug}`} className="chip">
                  {t.plural}
                </Link>
              );
            })}
          </div>
          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Products tracked", v: overview.products.toLocaleString("en") },
              { k: "In stock now", v: overview.inStock.toLocaleString("en") },
              { k: "Stores compared", v: storeCount.toLocaleString("en") },
              { k: "Last checked", v: timeAgo(overview.lastChecked) },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-line bg-raised px-4 py-3">
                <dt className="text-xs font-medium text-faint">{s.k}</dt>
                <dd className="tabular mt-1 font-display text-2xl font-bold">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="page">
        {latestSets.length > 0 && (
          <Section title="Latest sets" kicker="New & upcoming" href={`/${r.region}/sets`} linkLabel="All sets">
            <div className="grid gap-4 md:grid-cols-2">
              {latestSets.map((s) => {
                const items = (bySet.get(s.code) ?? [])
                  .filter((p) => p.productType !== "Pokémon Center Elite Trainer Box")
                  .sort((a, b) => ["Booster Box", "Elite Trainer Box", "Booster Bundle"].indexOf(a.productType) - ["Booster Box", "Elite Trainer Box", "Booster Bundle"].indexOf(b.productType))
                  .slice(0, 3);
                const pre = isPreorderSet(s.code);
                return (
                  <Link key={s.code} href={`/${r.region}/sets/${s.slug}`} className="card group flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {s.logo ? (
                          <img src={s.logo} alt="" className="h-10 w-24 object-contain" loading="lazy" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft font-display font-extrabold text-brand">
                            {s.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="font-display text-lg font-bold group-hover:text-brand">{s.name}</div>
                          <div className="text-xs text-faint">
                            {pre ? "Releases" : "Released"} {formatRelease(s.releaseDate)}
                          </div>
                        </div>
                      </div>
                      {pre && <span className="rounded-full bg-pre-soft px-2.5 py-1 text-xs font-semibold text-pre">Pre-order</span>}
                    </div>
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {items.length ? (
                        items.map((p) => (
                          <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                            <span className="text-muted">{p.productType}</span>
                            <span className="tabular font-semibold">
                              {p.inStockStores > 0 ? (
                                <>
                                  {money(p.lowestPriceCents, r.market)} <span className="font-normal text-faint">· {p.inStockStores} in stock</span>
                                </>
                              ) : (
                                <span className="text-faint">Sold out</span>
                              )}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2.5 text-sm text-faint">See all products</li>
                      )}
                    </ul>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {preorders.length > 0 && (
          <Section title="Open for pre-order" kicker="Upcoming sets" href={`/${r.region}/sealed?stock=in`}>
            <ProductGrid products={preorders} region={r.region} />
          </Section>
        )}

        <Section title="Booster boxes in stock" kicker="Newest sets first" href={`/${r.region}/type/booster-boxes`}>
          {boxes.length ? <ProductGrid products={boxes} region={r.region} eager={4} /> : <Empty>No booster boxes in stock right now.</Empty>}
        </Section>

        <Section title="Elite Trainer Boxes in stock" kicker="Newest sets first" href={`/${r.region}/type/elite-trainer-boxes`}>
          {etbs.length ? <ProductGrid products={etbs} region={r.region} /> : <Empty>No Elite Trainer Boxes in stock right now.</Empty>}
        </Section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "We read the stores", d: `Twice a day we read the sealed Pokémon listings of ${plural(storeCount, `${r.adjective} store`)} — their own prices, in ${r.currency}.` },
            { n: "2", t: "You see who has it", d: "Every product lists every store: in stock or sold out, and when we last checked. The cheapest in-stock price comes first." },
            { n: "3", t: "Restocks come to you", d: "Sold out everywhere? Leave your email on the product and we’ll tell you when any store has it again. No account needed." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-display font-extrabold text-brand">{s.n}</div>
              <h3 className="mt-4 font-display text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.d}</p>
            </div>
          ))}
        </section>

        {overview.products === 0 && (
          <div className="mt-10">
            <Empty>
              We&rsquo;re still reading {r.adjective} stores for the first time. Check back shortly.
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}

