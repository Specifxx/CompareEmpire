import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBar, SearchBarFallback } from "@/components/SearchBar";
import { CardTile } from "@/components/CardTile";
import { getValuableCards } from "@/lib/cheapest-cards";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// Dedicated lander for the biggest evergreen query family in the hobby:
// "pokemon card value" / "how much are my pokemon cards worth" / "price
// checker". The product behind it is the same database — this page frames it
// for that intent and captures the keyword.
export const dynamic = "force-dynamic";

// generateMetadata (not a static export) so the price-guide YEAR is always the
// current one — a hardcoded year silently goes stale and dents CTR every January.
export function generateMetadata(): Metadata {
  const year = new Date().getFullYear();
  return {
    title: `Pokémon Card Value Checker — Free Price Guide (${year})`,
    description:
      "Check what your Pokémon cards are worth, free: search any card to see its live market value plus real store prices in Australia, the US and the UK. Vintage Base Set to the newest Mega Evolution chases — updated daily.",
    keywords: [
      "pokemon card value",
      "pokemon card value checker",
      "how much are my pokemon cards worth",
      "what are my pokemon cards worth",
      "pokemon card price checker",
      "pokemon card worth",
      "rare pokemon card values",
      "pokemon card price guide",
    ],
    alternates: { canonical: "/card-value" },
  };
}

const FAQS = [
  {
    q: "How much are my Pokémon cards worth?",
    a: "Search the card's name (and collector number, printed bottom-left, e.g. 4/102) in the checker above. You'll see its live TCGplayer market value plus what real stores are charging for it right now in your country — both matter: market value is what it trades for, store prices are what you can actually buy or benchmark a sale against.",
  },
  {
    q: "Are my old Base Set cards from the 90s valuable?",
    a: "Often, yes — especially holographic rares. The 1999 Base Set Charizard is the most famous example, and 1st Edition stamps multiply value dramatically. Condition is critical: a mint copy can be worth 10× a played one. Look up any vintage card by name to see its current market value.",
  },
  {
    q: "What makes a Pokémon card valuable?",
    a: "Four things: rarity (Special/Illustration Rares, alt arts and vintage holos lead), condition (Near Mint commands the premium), edition (1st Edition and shadowless vintage prints), and demand (Charizard, Pikachu and Eeveelutions carry a permanent premium). Professionally graded copies (PSA/CGC 10) can be worth several times a raw card.",
  },
  {
    q: "Is this Pokémon card value checker free?",
    a: "Completely free, no account or signup. Values refresh daily from TCGplayer market data and live prices across the stores we track in Australia, the US and the UK.",
  },
];

export default async function CardValuePage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const valuable = await getValuableCards(12, country);

  return (
    <div className="flex flex-col gap-10">
      <section className="card-surface">
        {/* rounded-lg matches the section's own radius so this full-bleed
            background doesn't need overflow-hidden on the section (which would
            clip the search dropdown below instead of letting it scroll). */}
        <div className="relative rounded-lg border-l-2 border-brand-500 bg-ink-850 px-6 py-10 text-center">
          <h1 className="mx-auto max-w-3xl text-2xl font-extrabold text-white sm:text-4xl">
            Pokémon card value checker
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Type any card to see <strong className="text-white">what it&apos;s worth right now</strong> — live
            market value plus real {info.adjective} store prices, free, updated daily.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <Suspense fallback={<SearchBarFallback maxWidthClassName="" />}>
              <SearchBar />
            </Suspense>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Tip: include the collector number (printed bottom-left of the card, e.g. “Charizard 4/102”) to
            land on the exact printing.
          </p>
        </div>
      </section>

      {/* How values work — matches the question intent behind the query. */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Rarity", d: "Special & Illustration Rares, alt arts and vintage holos carry the value. Commons are pennies — and that's normal." },
          { t: "Condition", d: "Near Mint commands the premium; visible wear can cut value by 50–90%. Be honest grading your own cards." },
          { t: "Edition & era", d: "1st Edition and shadowless vintage prints (1999–2003) multiply value. The 30th-anniversary wave has vintage interest surging." },
          { t: "Grading", d: "PSA/CGC 10 copies sell for multiples of raw cards — but grading costs money; it's worth it for cards already valuable raw." },
        ].map((x) => (
          <div key={x.t} className="card-surface p-4">
            <h2 className="font-bold text-white">{x.t}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{x.d}</p>
          </div>
        ))}
      </section>

      {/* Live proof — the current most valuable cards in their market. */}
      {valuable.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">The most valuable cards right now</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Live {info.adjective} prices — click any card for its full value breakdown across stores.
              </p>
            </div>
            <Link href="/browse?priced=1&sort=price_desc" className="btn-ghost text-xs shrink-0">View all →</Link>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {valuable.map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vintage gateway — Base Set searches are spiking on 30th nostalgia. */}
      <Link
        href="/sets/base"
        className="card-surface flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-ink-600"
      >
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-white">Found a shoebox of 90s cards?</div>
          <p className="mt-0.5 text-xs text-slate-400">
            Start with the 1999 Base Set — every card priced, from common Rattata to the Charizard everyone hopes for.
          </p>
        </div>
        <span className="btn-primary shrink-0">Check Base Set values →</span>
      </Link>

      {/* Routes deeper into value content — concentrates internal link equity. */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/most-valuable" className="card-surface p-4 transition-colors hover:border-ink-600">
          <div className="text-sm font-extrabold text-white">Most valuable cards</div>
          <p className="mt-1 text-xs text-slate-400">The priciest Pokémon singles in stock right now, ranked.</p>
        </Link>
        <Link href="/trending" className="card-surface p-4 transition-colors hover:border-ink-600">
          <div className="text-sm font-extrabold text-white">Trending cards</div>
          <p className="mt-1 text-xs text-slate-400">What collectors are searching for most this week.</p>
        </Link>
      </section>

      {/* FAQ + JSON-LD */}
      <section className="card-surface p-6">
        <h2 className="text-xl font-extrabold text-white">Pokémon card value — FAQ</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
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
                { "@type": "ListItem", position: 2, name: "Card Value Checker", item: `${SITE_URL}/card-value` },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Pokémon Card Value Checker",
              url: `${SITE_URL}/card-value`,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: info.currency },
              description:
                "Free Pokémon card value checker: search any card for its live market value and real store prices across AU, US and UK.",
            },
          ]),
        }}
      />
    </div>
  );
}
