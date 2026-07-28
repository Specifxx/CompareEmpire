import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { getPopularCards } from "@/lib/cards";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// ISR: render the market-neutral (AU) baseline and cache it — prices localise
// client-side (CardTile + CountryProvider), so one cached, CDN-served page works
// for every market. Revalidate every 30 min so popularity stays fresh.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Trending Pokémon cards — most popular singles right now",
  description:
    "See which Pokémon singles collectors are looking at most right now. Updated daily from real searches and card views across every store we track.",
  alternates: { canonical: "/trending" },
};

export default async function TrendingPage() {
  const country = DEFAULT_COUNTRY;
  const info = COUNTRIES[country];

  const cards = await getPopularCards(24, country);

  const faqs = [
    {
      q: "How is 'trending' calculated?",
      a: "These are the Pokémon singles viewed most often by collectors on DexCompare in the current market. High view counts mean many people are actively checking prices — a reliable signal of collector demand.",
    },
    {
      q: "Are trending cards a good buy?",
      a: "Popularity indicates demand, but not necessarily value. Cross-check the card's 7-day price trend on its detail page and compare stores by delivered cost before buying. High-demand cards can be overpriced at some stores.",
    },
    {
      q: "How often does this list update?",
      a: "View counts are recorded in real time whenever a card page is opened. The ranking here refreshes every few hours, so cards riding a wave of fresh interest rise quickly.",
    },
    {
      q: `Are prices shown in ${info.currency}?`,
      a: `Yes — all prices are in ${info.currency} from ${info.adjective} stores. Switch your market in the top-right corner to see trending cards for Australia, New Zealand, the US, or the UK.`,
    },
  ];

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Trending cards", item: `${SITE_URL}/trending` },
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
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-900 px-6 py-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded border border-ink-700 bg-ink-950 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-up" />
              Live
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            Trending Pokémon cards — what collectors are watching
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            The {info.adjective} Pokémon singles with the most eyes on them right now. Based on
            real card views across DexCompare — updated continuously. Popularity often moves before
            prices do.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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

      {/* Card grid */}
      {cards.length === 0 ? (
        <section className="card-surface grid place-items-center p-14 text-center">
          <p className="text-sm text-slate-400">
            Trending data builds up as collectors browse — check back soon, or{" "}
            <Link href="/browse" className="text-brand-400 hover:underline">
              browse all cards
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold text-white">Most-viewed right now</h2>
              <Link href="/browse?priced=1&sort=views_desc" className="text-xs font-medium text-slate-400 hover:text-white">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {cards.map((card) => (
                <CardTile key={card.id} card={card} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Internal nav */}
      <section className="card-surface p-5">
        <h2 className="text-sm font-semibold text-slate-300">More ways to browse</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/deals" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Today&apos;s deals
          </Link>
          <Link href="/most-valuable" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Most valuable cards
          </Link>
          <Link href="/browse" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Full card database
          </Link>
          <Link href="/guides/cheapest-way-to-buy-pokemon-cards" className="rounded bg-ink-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-ink-700 hover:text-white">
            Buying strategy guide
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">Trending Pokémon cards — FAQ</h2>
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
        Popularity is based on DexCompare page views in the {info.adjective} market. Prices are
        live store listings in {info.currency}.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd ? [breadcrumb, faqLd, itemListLd] : [breadcrumb, faqLd]) }} />
    </div>
  );
}
