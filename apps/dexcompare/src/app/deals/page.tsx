import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { getTopDeals } from "@/lib/deals";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// ISR: cache the AU-baseline deals render (prices localise client-side), and
// revalidate every 15 min so the list stays fresh without an uncached DB hit per view.
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Pokémon card deals — biggest discounts vs market price",
  description:
    "Pokémon singles selling well below their TCGplayer market price right now, across stores in Australia, New Zealand, the US and the UK. Updated daily — the fastest way to snipe underpriced cards.",
  alternates: { canonical: "/deals" },
};

export default async function DealsPage() {
  const country = DEFAULT_COUNTRY;
  const info = COUNTRIES[country];
  const deals = await getTopDeals(60, country);

  const faqs = [
    {
      q: "What counts as a deal on DexCompare?",
      a: `A deal is a live ${info.adjective} store price at least 15% below the card's TCGplayer market guide. We cap deals at 70% off — deeper gaps are almost always listing errors, not real bargains.`,
    },
    {
      q: "How often do the deals update?",
      a: "Every price import — typically daily. Newly underpriced listings appear at the next refresh, and sold-out ones drop off automatically.",
    },
    {
      q: `Are the prices shown in ${info.currency}?`,
      a: `Yes. Store prices are the live ${info.adjective} prices in ${info.currency}; the market guide is TCGplayer's market price converted at an indicative rate for comparison only.`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-900 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Today&apos;s best Pokémon deals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Cards listed by {info.adjective} stores <strong className="text-white">well below their TCGplayer
            market price</strong> right now. Every deal shows the live store price next to the market guide —
            click through and snipe it before someone else does.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            We only count real market guides (TCGplayer) and cap discounts at 70% — deeper than that is
            usually a listing error, not a deal. Refreshed with every import.
          </p>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      {deals.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center">
          <p className="text-lg font-semibold text-white">No standout deals in {info.place} right now</p>
          <p className="mt-1 text-sm text-slate-400">
            Deals appear when a store undercuts the market guide by 15% or more — check back after the next
            price refresh, or browse the cheapest cards instead.
          </p>
          <Link href="/browse?priced=1&sort=price_asc" className="btn-primary mt-4">Browse cheapest cards</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {deals.map((d) => (
            <div key={d.card.id}>
              <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
                <span className="num text-up">−{d.pct}% vs market</span>
                <span className="num text-slate-500 line-through">{formatMoney(d.guideCents, info.currency)}</span>
              </div>
              <CardTile card={d.card} />
            </div>
          ))}
        </div>
      )}

      {/* Contextual FAQ — visible content backing the FAQPage structured data. */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">Pokémon deals — FAQ</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] text-slate-600">
        Market guide is TCGplayer&apos;s market price converted to {info.currency} at an indicative rate.
        Always confirm price and condition on the store&apos;s site before buying.
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Deals", item: `${SITE_URL}/deals` },
              ],
            },
            ...(deals.length
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    itemListElement: deals.map((d, i) => ({
                      "@type": "ListItem",
                      position: i + 1,
                      url: `${SITE_URL}/card/${d.card.slug ?? d.card.id}`,
                      name: d.card.name,
                    })),
                  },
                ]
              : []),
          ]),
        }}
      />
    </div>
  );
}
