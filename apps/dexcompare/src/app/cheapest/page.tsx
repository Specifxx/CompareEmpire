import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { getCheapestCardsInBand } from "@/lib/cheapest-cards";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// Per-request: card prices depend on the visitor's market.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cheapest Pokémon cards for sale — under $5, $10 & $50",
  description:
    "Find the cheapest Pokémon singles in stock right now, sorted by price across every store we track. Browse cards under $5, $10, and $50 — updated daily.",
  alternates: { canonical: "/cheapest" },
};

const BANDS = [
  { label: "Under", max: 5, min: null, browseHref: "/browse?priced=1&sort=price_asc&max=5" },
  { label: "to", max: 10, min: 5, browseHref: "/browse?priced=1&sort=price_asc&min=5&max=10" },
  { label: "to", max: 50, min: 10, browseHref: "/browse?priced=1&sort=price_asc&min=10&max=50" },
] as const;

export default async function CheapestPage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const sym = info.currency === "GBP" ? "£" : "$";

  const [under5, band5to10, band10to50] = await Promise.all([
    getCheapestCardsInBand(null, 5, 8, country),
    getCheapestCardsInBand(5, 10, 8, country),
    getCheapestCardsInBand(10, 50, 8, country),
  ]);

  const sections = [
    { title: `Under ${sym}5`, cards: under5, browseHref: BANDS[0].browseHref },
    { title: `${sym}5 – ${sym}10`, cards: band5to10, browseHref: BANDS[1].browseHref },
    { title: `${sym}10 – ${sym}50`, cards: band10to50, browseHref: BANDS[2].browseHref },
  ];

  const faqs = [
    {
      q: "Are these really the cheapest Pokémon cards available?",
      a: `Yes — these are the lowest in-stock ${info.adjective} store prices across every retailer we track, refreshed daily. We only show cards that are genuinely available to buy right now.`,
    },
    {
      q: "How do I find even cheaper cards?",
      a: `Use the full card database at /browse with sort "Price: low–high" — you can also filter by set, rarity, or type to narrow it down. The Deals page lists cards that are additionally below their market guide price.`,
    },
    {
      q: "Do the prices shown include postage?",
      a: `The prices here are the in-store listed prices. On each card's detail page, the comparison table sorts stores by their delivered cost (price + estimated postage to you), so you can see the true total before buying.`,
    },
    {
      q: `Are prices shown in ${info.currency}?`,
      a: `Yes — all prices shown are in ${info.currency} from ${info.adjective} stores. Switch your market in the top-right corner of the site to see prices for Australia, New Zealand, the US, or the UK.`,
    },
  ];

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cheapest cards", item: `${SITE_URL}/cheapest` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-900 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            Cheapest Pokémon cards for sale right now
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Buying Pokémon singles doesn&apos;t have to be expensive. Every card below is{" "}
            <strong className="text-white">in stock today</strong> at an {info.adjective} store,
            sorted cheapest-first. We compare {info.adjective} prices so you always pay less.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/browse?priced=1&sort=price_asc"
              className="rounded-full bg-ink-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-ink-600 hover:text-white"
            >
              Browse all priced cards →
            </Link>
            <Link
              href="/deals"
              className="rounded-full bg-ink-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-ink-600 hover:text-white"
            >
              Today&apos;s biggest deals →
            </Link>
          </div>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      {/* Price-band sections */}
      {sections.map(({ title, cards, browseHref }) => (
        <section key={title} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold text-white">{title}</h2>
            <Link
              href={browseHref}
              className="text-xs font-medium text-slate-400 hover:text-white"
            >
              See all →
            </Link>
          </div>

          {cards.length === 0 ? (
            <div className="card-surface grid place-items-center p-10 text-center">
              <p className="text-sm text-slate-400">
                No cards in this price band right now —{" "}
                <Link href={browseHref} className="text-brand-400 hover:underline">
                  browse all
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {cards.map((card) => (
                <CardTile key={card.id} card={card} />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Internal nav */}
      <section className="card-surface p-5">
        <h2 className="text-sm font-semibold text-slate-300">Find more bargains</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/deals" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Today&apos;s deals
          </Link>
          <Link href="/browse?priced=1&sort=price_asc" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Full card database
          </Link>
          <Link href="/sealed" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Cheapest sealed products
          </Link>
          <Link href="/guides/cheapest-way-to-buy-pokemon-cards" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Cheapest way to buy guide
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">Cheapest Pokémon cards — FAQ</h2>
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
        Prices are live {info.adjective} store listings in {info.currency}. Always confirm stock
        and condition on the store&apos;s site before purchasing.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, faqLd]) }} />
    </div>
  );
}
