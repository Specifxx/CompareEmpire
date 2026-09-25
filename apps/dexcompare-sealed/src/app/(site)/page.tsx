import Link from "next/link";
import type { Metadata } from "next";
import { RegionSuggest } from "@/components/RegionSuggest";
import { REGION_LIST } from "@/lib/regions";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { STORES, storesInMarket } from "@/lib/stores";
import { PRODUCT_TYPES } from "@/lib/sealed-title";

// Fully static: counts come from the store registry, not the database, so
// this page costs nothing to serve and never depends on the database.
export const metadata: Metadata = {
  title: `${SITE_NAME} — Pokémon sealed prices & stock, compared`,
  description: `${SITE_TAGLINE} ${STORES.length} stores across Australia, the US, the UK, Canada, New Zealand, Europe and Singapore.`,
  alternates: { canonical: SITE_URL },
};

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-16 h-96 w-96 rounded-full bg-brand/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-spark/20 blur-3xl" />
        <div className="page relative py-16 text-center sm:py-24">
          <div className="eyebrow">Booster boxes · ETBs · bundles · collections · tins</div>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Every store&rsquo;s Pokémon sealed stock, <span className="text-brand">in one place.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
            DexCompare checks {STORES.length} independent stores twice a day and shows who has it in stock and who&rsquo;s cheapest.
          </p>
          <div className="mt-8 flex justify-center">
            <RegionSuggest />
          </div>
        </div>
      </section>

      <section className="page">
        <h2 className="mb-5 text-center font-display text-2xl font-bold">Choose your region</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REGION_LIST.map((r) => {
            const n = storesInMarket(r.market).length;
            return (
              <Link key={r.region} href={`/${r.region}`} className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <span className="text-4xl" aria-hidden="true">{r.flag}</span>
                <span>
                  <span className="block font-display text-lg font-bold group-hover:text-brand">{r.name}</span>
                  <span className="block text-sm text-muted">
                    {n} stores · {r.currency}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="page mt-20 grid gap-6 md:grid-cols-3">
        {[
          { t: "Only real, buyable prices", d: "Every price is a store’s own listing in your currency. The headline price is always something you can order today — never a sold-out or stale listing." },
          { t: "Stock you can trust", d: "Each listing shows when we last read it. If a store hasn’t answered for three days we say “not checked recently” instead of guessing." },
          { t: "Every store, one page", d: "Each product lists every store we track in your region, cheapest in-stock first, with a link straight to the store’s own page." },
        ].map((f) => (
          <div key={f.t} className="card p-6">
            <h3 className="font-display text-lg font-bold">{f.t}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="page mt-16 text-center">
        <div className="eyebrow mb-3">What we compare</div>
        <div className="flex flex-wrap justify-center gap-2">
          {PRODUCT_TYPES.slice(0, 13).map((t) => (
            <span key={t.key} className="chip">
              {t.plural}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
