import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CardTile } from "@/components/CardTile";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { getHomeData } from "@/lib/home-data";
import { getTopDeals } from "@/lib/deals";
import { formatMoney } from "@/lib/format";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, type CountryInfo } from "@/lib/country";
import { Logo } from "@/components/Logo";
import { CountUp } from "@/components/CountUp";
import { SearchBar } from "@/components/SearchBar";
import { HomeShoppableGrid } from "@/components/HomeShoppableGrid";

// ISR while AU-only; becomes dynamic per-request when NZ mode is enabled (getCountry
// then reads the country cookie).
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Buy & Compare Pokémon Card Prices | DexCompare" },
  description:
    "Compare live Pokémon TCG card prices across stores in Australia, New Zealand, the United States and the United Kingdom, and find the cheapest place to buy Pokémon singles. Updated daily.",
  keywords: [
    "buy Pokémon cards",
    "Pokémon prices",
    "Pokémon card value",
    "Pokémon card price checker",
    "compare Pokémon card prices",
    "cheapest Pokémon cards",
    "Pokémon singles",
    "Pokémon TCG",
    "Pokémon card prices",
  ],
  alternates: { canonical: "/" },
};

function ebayLabel(country: string): string | null {
  return country === "AU" ? "eBay AU" : country === "US" ? "eBay US" : null;
}

function faqsFor(info: CountryInfo, ebay: string | null): { q: string; a: string }[] {
  const { adjective, place, currency } = info;
  return [
    {
      q: `Where can I buy Pokémon cards in ${place}?`,
      a: `DexCompare compares live Pokémon prices across a wide range of ${adjective} stores${ebay ? ` plus ${ebay}` : ""}, so you can buy Pokémon cards from whichever shop is cheapest. Search any card to see every store's price and click straight through to buy.`,
    },
    {
      q: `How do I find the cheapest Pokémon prices in ${place}?`,
      a: `Search or browse the card database and each card shows the lowest live price across ${adjective} stores, ranked by total delivered cost (item plus shipping). It's the fastest way to find the cheapest Pokémon cards in ${place}.`,
    },
    {
      q: "How many Pokémon cards does DexCompare track?",
      a: `DexCompare covers a comprehensive database of Pokémon singles, each priced live across ${adjective} retailers so you can always find the cheapest place to buy.`,
    },
    {
      q: "How much are my Pokémon cards worth?",
      a: `Use the free Pokémon card value checker: search any card by name and collector number to see its live market value plus real ${adjective} store prices, updated daily.`,
    },
    {
      q: `Are the Pokémon prices shown in ${currency}?`,
      a: `Yes. Every price is the live ${adjective} price in ${currency}, so there are no surprise currency conversions — what you see is what you pay locally.`,
    },
  ];
}

export default async function HomePage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const ebay = ebayLabel(country);
  const faqs = faqsFor(info, ebay);
  const [{ totalCards, inStockUnits, storeCount, featuredGrid }, deals] = await Promise.all([
    getHomeData(country),
    getTopDeals(12, country),
  ]);

  return (
      <div className="flex flex-col gap-10">
        {/* ── Hero: search-first gateway to the database ── */}
        {/* No overflow-hidden here: the search dropdown is absolutely positioned
            inside this section and needs to render (and scroll) past its bottom
            edge instead of being clipped by it. */}
        <section className="card-surface relative">
          <div className="px-5 py-9 sm:px-8 sm:py-11">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-3">
                <Logo size={40} />
                <span className="inline-flex items-center gap-2 rounded border border-ink-700 bg-ink-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
                  </span>
                  Live prices · updated daily
                </span>
              </div>

              <h1 className="max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                The Pokémon card <span className="text-brand-400">price database</span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                Search <span className="num text-slate-300">{totalCards.toLocaleString()}</span> cards and compare every {info.adjective} store&apos;s live price to find the cheapest place to buy.
              </p>

              {/* Search — the primary action */}
              <div className="w-full max-w-2xl">
                <Suspense fallback={<div className="input" />}>
                  <SearchBar />
                </Suspense>
              </div>

              {/* Only the essential shortcuts */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { href: "/browse", label: "Browse all" },
                  { href: "/deals", label: "Deals" },
                  { href: "/card-value", label: "Value checker" },
                ].map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    prefetch={false}
                    className="chip rounded border border-ink-700 bg-ink-950 px-3 py-1 text-sm text-slate-300 outline-none transition-colors hover:border-brand-500 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>

              <CountryHeroToggle />

              {/* Thin credibility stats */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
                <Stat value={totalCards} label="cards" />
                <span className="text-ink-700" aria-hidden>·</span>
                <Stat value={inStockUnits} label="in-stock listings" />
                <span className="text-ink-700" aria-hidden>·</span>
                <Stat value={storeCount} label={`${info.code} stores`} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Browse the database (the core) ── */}
        <HomeShoppableGrid cards={featuredGrid} totalCards={totalCards} storeCount={storeCount} adjective={info.adjective} />

        {/* ── One highlight: today's best deals ── */}
        {deals.length >= 4 && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
                  <span className="h-5 w-1 bg-brand-500" aria-hidden />
                  Today&apos;s best deals
                </h2>
                <p className="mt-1 text-xs text-slate-400">{info.adjective} store prices well below the TCGplayer market guide right now.</p>
              </div>
              <Link href="/deals" className="btn-ghost shrink-0 text-xs">All deals →</Link>
            </div>
            <Carousel>
              {deals.map((d) => (
                <div key={d.card.id} className="w-36 shrink-0 snap-start sm:w-44">
                  <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
                    <span className="num text-up">−{d.pct}%</span>
                    <span className="num text-slate-500 line-through">{formatMoney(d.guideCents, info.currency)}</span>
                  </div>
                  <CardTile card={d.card} />
                </div>
              ))}
            </Carousel>
          </section>
        )}

        {/* ── About + FAQ (SEO) ── */}
        <section className="card-surface p-6">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">Pokémon prices in {info.place}, all in one place</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            DexCompare is a free, independent price-comparison tool for the Pokémon Trading Card Game. We track live prices
            for every Pokémon card across {info.adjective} stores{ebay ? ` and ${ebay}` : ""} so you can buy Pokémon cards
            in {info.place} for less — find the cheapest store for any single, fast.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {faqs.map((f) => (
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </div>
  );
}

// Thin live stat: real number always in the DOM (SEO), animated on scroll.
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="num font-extrabold text-slate-200"><CountUp value={value} /></span>{" "}
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  );
}

// Horizontal snap carousel with faded scroll edges.
function Carousel({ children }: { children: ReactNode }) {
  return (
    <div className="edge-fade snap-x-mandatory -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {children}
    </div>
  );
}
