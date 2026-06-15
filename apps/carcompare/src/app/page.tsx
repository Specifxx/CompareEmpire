import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { getCheapestCards } from "@/lib/cheapest-cards";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, priceField, type CountryInfo } from "@/lib/country";
import { SETS, domainInfo, DOMAIN_KEYS } from "@/lib/constants";
import { Logo } from "@/components/Logo";

// ISR while AU-only; becomes dynamic per-request when NZ mode is enabled (getCountry
// then reads the country cookie).
export const revalidate = 86400;

// Market-neutral metadata (no country in the title) so search results aren't biased
// to one country — the visible page below is still tailored to the visitor's market.
export const metadata: Metadata = {
  title: { absolute: "Compare Car Prices | CarCompare" },
  description:
    "Compare live car prices across stores in Australia, the US and the UK, and find the cheapest place to buy your next mirrorless, DSLR or compact car. Updated daily.",
  keywords: [
    "buy cars",
    "car prices",
    "compare car prices",
    "cheapest cars",
    "mirrorless car deals",
    "DSLR prices",
    "car price comparison",
  ],
  alternates: { canonical: "/" },
};

// eBay marketplace label per market (NZ has no eBay).
function ebayLabel(country: string): string | null {
  return country === "AU" ? "eBay AU" : country === "US" ? "eBay US" : null;
}

// FAQ content tailored to the visitor's market. Uses `place` after "in" (so US
// reads "in the United States") and `adjective` before nouns ("Australian stores").
function faqsFor(info: CountryInfo, ebay: string | null): { q: string; a: string }[] {
  const { adjective, place, currency } = info;
  return [
    {
      q: `Where can I buy cars in ${place}?`,
      a: `CarCompare compares live car prices across a wide range of ${adjective} stores${ebay ? ` plus ${ebay}` : ""}, so you can buy from whichever shop is cheapest. Search any car to see every store's price and click straight through to buy.`,
    },
    {
      q: `How do I find the cheapest car prices in ${place}?`,
      a: `Search or browse the car database and each car shows the lowest live price across ${adjective} stores, ranked by total delivered cost (item plus shipping). It's the fastest way to find the cheapest cars in ${place}.`,
    },
    {
      q: "What cars does CarCompare cover?",
      a: `We compare prices on mirrorless cars, DSLRs, compacts, action cars and lenses from the major brands, all priced across ${adjective} retailers.`,
    },
    {
      q: `Are the car prices shown in ${currency}?`,
      a: `Yes. Every price is the live ${adjective} price in ${currency}, so there are no surprise currency conversions — what you see is what you pay locally.`,
    },
  ];
}

export default async function HomePage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const ebay = ebayLabel(country);
  const faqs = faqsFor(info, ebay);
  const field = priceField(country);
  const [totalCards, pricedCards, cheapestCards, storeGroups] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { [field]: { not: null } } }),
    // Lowest-priced singles, leading with the best-stocked bargains (price, then coverage).
    getCheapestCards(12, country),
    // Stores serving the selected market (eBay excluded from the count).
    prisma.retailerPrice.groupBy({ by: ["retailer"], where: { country, NOT: { retailer: { startsWith: "ebay" } } } }),
  ]);
  const storeCount = storeGroups.length;

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="card-surface animate-fade-up overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <span className="animate-float"><Logo size={76} /></span>
          </div>
          <h1 className="mx-auto max-w-3xl text-2xl font-extrabold text-white sm:text-4xl">
            Compare car prices across {info.adjective} stores
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Find the cheapest place to buy your next car in {info.place} — live prices in{" "}
            {info.currency} compared across {storeCount} {info.adjective} stores, updated daily.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn-primary">Browse cars</Link>
          </div>

          {/* Country / market toggle */}
          <CountryHeroToggle />

          {/* Stats */}
          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-4">
            <Stat value={totalCards.toLocaleString()} label="cars" />
            <Stat value={pricedCards.toLocaleString()} label="priced" />
            <Stat value={String(storeCount)} label={`${info.code} stores`} />
          </div>
        </div>
      </section>

      {/* Cheapest cards — lowest live prices, showing how many stores we compare per card */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Cheapest cars</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The lowest live prices right now — we check {storeCount} {info.adjective} stores for every car so you always pay the least.
            </p>
          </div>
          <Link href="/browse?priced=1&sort=price_asc" className="btn-ghost text-xs shrink-0">View all →</Link>
        </div>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {cheapestCards.map((c) => (
            <div key={c.id} className="w-36 shrink-0 sm:w-44">
              <CardTile card={c} />
            </div>
          ))}
        </div>
      </section>

      {/* Browse by make */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-white">Browse by make</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SETS.map((s) => (
            <Link
              key={s.code}
              href={`/browse?set=${s.code}`}
              className="card-surface flex items-center justify-center p-5 text-center text-base font-bold text-white transition-colors hover:border-brand-500"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by sensor */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-white">Browse by body type</h2>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_KEYS.map((k) => {
            const d = domainInfo(k);
            return (
              <Link
                key={k}
                href={`/browse?domain=${encodeURIComponent(k)}`}
                className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500"
                style={{ color: d.color }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* About + FAQ — keyword-relevant content for search */}
      <section className="card-surface p-6">
        <h2 className="text-xl font-extrabold text-white">Car prices in {info.place}, all in one place</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          CarCompare is a free, independent price-comparison tool for cars, built for
          {" "}{info.adjective} buyers. We track live prices for mirrorless bodies, DSLRs, compacts,
          action cars and lenses across {info.adjective} stores{ebay ? ` and ${ebay}` : ""} so you
          can buy your next car in {info.place} for less.
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-ink-900/70 p-3">
      <div className="text-xl font-extrabold text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
