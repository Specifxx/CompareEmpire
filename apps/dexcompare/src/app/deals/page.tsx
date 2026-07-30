import type { Metadata } from "next";
import Link from "next/link";
import { DealsGrid } from "@/components/DealsGrid";
import { AdSlot } from "@/components/AdSlot";
import { getTopDeals, type Deal } from "@/lib/deals";
import { COUNTRY_LIST, DEFAULT_COUNTRY, type Country } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// ISR: cache the AU-baseline deals render (prices localise client-side), and
// revalidate every 15 min so the list stays fresh without an uncached DB hit per view.
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Pokémon card deals — biggest discounts vs market price",
  description:
    "Pokémon singles selling below TCGplayer market price across AU, US and UK stores. Updated daily — the fastest way to snipe underpriced cards.",
  alternates: { canonical: "/deals" },
};

export default async function DealsPage() {
  // Fetched for EVERY market so the client island can render the visitor's region
  // (the cached HTML can't vary by cookie). Each is a take-capped read of the
  // precomputed Deal table, cached per market.
  // Never let a DB hiccup fail this prerender outright — an empty deals list
  // (retried on the next ISR revalidation) beats taking the whole build down.
  const dealLists = await Promise.all(
    COUNTRY_LIST.map((c) => getTopDeals(60, c.code).catch(() => [] as Deal[]))
  );
  const dealsByMarket: Partial<Record<Country, Deal[]>> = {};
  COUNTRY_LIST.forEach((c, i) => {
    dealsByMarket[c.code] = dealLists[i] ?? [];
  });
  const marketNames = COUNTRY_LIST.map((c) => c.adjective).join(", ").replace(/, ([^,]*)$/, " and $1");
  // The ItemList below is structured data, and this page is cached as ONE document,
  // so it must describe what a cookie-less crawler actually renders: <DealsGrid>
  // falls back to the DEFAULT market when there's no country cookie, so list that
  // market's deals. (The grid is a client component but has no useSearchParams, so
  // it still server-renders into the cached HTML — the crawler does see the cards.)
  const crawlerDeals = dealsByMarket[DEFAULT_COUNTRY] ?? [];

  const faqs = [
    {
      q: "What counts as a deal on DexCompare?",
      a: `A deal is a live store price in your selected market (${marketNames}) at least 15% below the card's TCGplayer market guide. We cap deals at 70% off — deeper gaps are almost always listing errors, not real bargains.`,
    },
    {
      q: "How often do the deals update?",
      a: "Every price import — typically daily. Newly underpriced listings appear at the next refresh, and sold-out ones drop off automatically.",
    },
    {
      q: "Are the prices shown in my local currency?",
      a: "Yes. Store prices are the live prices for your selected market in that market's currency — AUD in Australia, USD in the US and GBP in the UK; the market guide is TCGplayer's market price converted at an indicative rate for comparison only.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-900 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Today&apos;s best Pokémon deals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Cards listed by {marketNames} stores <strong className="text-white">well below their TCGplayer
            market price</strong> right now. Every deal shows the live store price next to the market guide —
            click through and snipe it before someone else does. Use the region switcher to change market.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            We only count real market guides (TCGplayer) and cap discounts at 70% — deeper than that is
            usually a listing error, not a deal. Refreshed with every import.
          </p>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      <DealsGrid dealsByMarket={dealsByMarket} />

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
        Market guide is TCGplayer&apos;s market price converted to your market&apos;s currency at an indicative rate.
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
            ...(crawlerDeals.length
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    itemListElement: crawlerDeals.map((d, i) => ({
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
