import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { getValuableCards } from "@/lib/cheapest-cards";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// High-intent lander for "most valuable / most expensive Pokémon cards" — a huge
// evergreen query the value checker only answered with a small carousel before.
// Real, live data (the priciest in-stock singles), ranked, with genuine context.
// ISR: cache the AU-baseline render (prices localise client-side), revalidate hourly.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const year = new Date().getFullYear();
  return {
    title: `Most Valuable Pokémon Cards — Live Prices, Ranked (${year})`,
    description:
      "The most valuable Pokémon cards in stock right now, ranked by live price across every store we track — vintage holos, alt arts, SIRs. Updated daily.",
    keywords: [
      "most valuable pokemon cards",
      "most expensive pokemon cards",
      "rare pokemon card prices",
      "valuable pokemon cards list",
      "expensive pokemon cards",
      "chase pokemon cards",
    ],
    alternates: { canonical: "/most-valuable" },
  };
}

const FACTORS = [
  { t: "Rarity", d: "Special & Illustration Rares, alt arts and vintage holos lead. The rarer the print run, the steeper the price." },
  { t: "Condition", d: "Near Mint commands the premium; a graded PSA/CGC 10 can be worth several times a raw copy of the same card." },
  { t: "Edition & era", d: "1st Edition and shadowless vintage prints (1999–2003) multiply value — the cards that started it all." },
  { t: "Demand", d: "Charizard, Pikachu and the Eeveelutions carry a permanent premium; chase cards from the newest sets spike on hype." },
];

const FAQS = [
  {
    q: "What is the most valuable Pokémon card?",
    a: "Among cards you can actually buy, vintage 1st Edition Base Set holos — the 1999 Charizard above all — and modern alt-art chase cards top the list. One-off promos like the Pikachu Illustrator sell for far more at auction but almost never trade. This page ranks the most valuable cards in stock across the stores we track right now.",
  },
  {
    q: "Why are some Pokémon cards so expensive?",
    a: "Four things stack up: rarity (tiny print runs), condition (Near Mint and graded copies command big premiums), edition (1st Edition and shadowless vintage prints), and demand (Charizard, Pikachu and the Eeveelutions never go out of fashion). When all four line up, prices climb fast.",
  },
  {
    q: "How do I know what my valuable card is worth?",
    a: "Use the free value checker: search the card by name and collector number to see its live market value plus real store prices in your country. Condition is critical — a Near Mint copy can be worth many times a played one.",
  },
  {
    q: "Are these the most valuable cards ever, or just right now?",
    a: "This list is live — it ranks the priciest Pokémon singles in stock across our tracked stores today, so it moves with the market. For all-time records, those are auction sales of one-off cards that rarely change hands.",
  },
];

export default async function MostValuablePage() {
  const country = DEFAULT_COUNTRY;
  const info = COUNTRIES[country];
  const cards = await getValuableCards(24, country);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Most Valuable Cards", item: `${SITE_URL}/most-valuable` },
    ],
  };
  const itemListLd = cards.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: cards.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/card/${c.slug ?? c.id}`,
          name: c.name,
        })),
      }
    : null;

  return (
    <div className="flex flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd ? [faqLd, breadcrumbLd, itemListLd] : [faqLd, breadcrumbLd]) }} />

      <section className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-850 px-6 py-9">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">The most valuable Pokémon cards right now</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            The priciest Pokémon singles in stock across {info.adjective} stores today, ranked by live price. Click any card
            for its full value breakdown — or check what <Link href="/card-value" className="font-semibold text-brand-400 hover:underline">your own cards are worth</Link>.
          </p>
        </div>
      </section>

      {cards.length > 0 ? (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
            <span className="h-5 w-1 bg-brand-500" aria-hidden />
            Top {cards.length}, by live price
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <CardTile key={c.id} card={c} />
            ))}
          </div>
          <div className="mt-4">
            <Link href="/browse?priced=1&sort=price_desc" className="btn-ghost text-xs">See the full ranking →</Link>
          </div>
        </section>
      ) : (
        <section className="card-surface grid place-items-center p-14 text-center">
          <p className="text-sm text-slate-400">
            Prices are refreshing — check back shortly, or{" "}
            <Link href="/browse?priced=1&sort=price_desc" className="text-brand-400 hover:underline">browse by price</Link>.
          </p>
        </section>
      )}

      <AdSlot format="horizontal" height={90} />

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-white">What makes a Pokémon card valuable</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTORS.map((x) => (
            <div key={x.t} className="card-surface p-4">
              <h3 className="font-bold text-white">{x.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/card-value" className="card-surface p-4 transition-colors hover:border-ink-600">
          <div className="text-sm font-extrabold text-white">Value checker</div>
          <p className="mt-1 text-xs text-slate-400">What&apos;s your card worth? Search any card.</p>
        </Link>
        <Link href="/sets/base" className="card-surface p-4 transition-colors hover:border-ink-600">
          <div className="text-sm font-extrabold text-white">1999 Base Set</div>
          <p className="mt-1 text-xs text-slate-400">Where the vintage value lives — every card priced.</p>
        </Link>
      </section>

      <section className="card-surface p-6">
        <h2 className="text-xl font-extrabold text-white">Most valuable Pokémon cards — FAQ</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
