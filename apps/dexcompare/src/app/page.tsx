import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { getCheapestCards, getValuableCards } from "@/lib/cheapest-cards";
import { getTopMovers, getPopularCards } from "@/lib/trending";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, priceField, type CountryInfo } from "@/lib/country";
import { SETS, domainInfo, DOMAIN_KEYS } from "@/lib/constants";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { Logo } from "@/components/Logo";

// ISR while AU-only; becomes dynamic per-request when NZ mode is enabled (getCountry
// then reads the country cookie).
export const revalidate = 180;

// Market-neutral metadata (no country in the title) so search results aren't biased
// to one country — the visible page below is still tailored to the visitor's market.
export const metadata: Metadata = {
  title: { absolute: "Buy & Compare Pokémon Card Prices | DexCompare" },
  description:
    "Compare live Pokémon TCG card prices across stores in Australia, New Zealand, the United States and the United Kingdom, and find the cheapest place to buy Pokémon singles. Updated daily.",
  keywords: [
    "buy Pokémon cards",
    "Pokémon prices",
    "compare Pokémon card prices",
    "cheapest Pokémon cards",
    "Pokémon singles",
    "Pokémon TCG",
    "Pokémon card prices",
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
  const field = priceField(country);
  const [totalCards, pricedCards, inStockUnits, cheapestCards, valuableCards, storeGroups, movers, popularCards] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { [field]: { not: null } } }),
    // Live, in-stock store listings analysed in this market — the real units we
    // compared (the market-guide reference rows are not a buyable unit, so excluded).
    prisma.retailerPrice.count({ where: { country, inStock: true, NOT: { retailer: { startsWith: "marketguide" } } } }),
    // Lowest-priced singles, leading with the best-stocked bargains (price, then coverage).
    getCheapestCards(12, country),
    // Most valuable singles (chase cards), highest-first.
    getValuableCards(12, country),
    // Stores serving the selected market (eBay excluded from the count).
    prisma.retailerPrice.groupBy({ by: ["retailer"], where: { country, NOT: { retailer: { startsWith: "ebay" } } } }),
    // Biggest 7-day movers from the daily snapshots, in the visitor's own market.
    getTopMovers(12, country),
    // Most-viewed priced cards in this market.
    getPopularCards(12, country),
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
            Compare Pokémon card prices across {info.adjective} stores
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Find the cheapest place to buy Pokémon TCG cards in {info.place} — live prices in{" "}
            {info.currency} compared across {storeCount} {info.adjective} stores, updated daily.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn-primary">Browse the database</Link>
          </div>

          {/* Country / market toggle */}
          <CountryHeroToggle />

          {/* Stats */}
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={totalCards.toLocaleString()} label="cards" />
            <Stat value={pricedCards.toLocaleString()} label="priced" />
            <Stat value={inStockUnits.toLocaleString()} label="in-stock listings" />
            <Stat value={String(storeCount)} label={`${info.code} stores`} />
          </div>
        </div>
      </section>

      {/* Recently viewed — local to this visitor; renders nothing on a first visit */}
      <RecentlyViewed />

      {/* Biggest price movers — 7-day change from the daily price snapshots, in
          the visitor's market. Hidden until two days of that market's history exist. */}
      {movers.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">Biggest price movers</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The sharpest rises and falls in the cheapest {info.adjective} price over the last week.
              </p>
            </div>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {movers.map((m) => (
              <div key={m.card.id} className="w-36 shrink-0 sm:w-44">
                <div
                  className={`mb-1.5 text-center text-xs font-bold ${
                    m.pct > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {m.pct > 0 ? "▲" : "▼"} {Math.abs(m.pct).toFixed(1)}% this week
                </div>
                <CardTile card={m.card} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cheapest cards — lowest live prices, showing how many stores we compare per card */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Cheapest Pokémon cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The lowest live prices right now — we check {storeCount} {info.adjective} stores for every card so you always pay the least.
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

      {/* Most valuable cards — the chase grails, highest-first */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Most valuable cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The biggest chase cards by market value — Charizards, alt-arts, vintage holos and more.
            </p>
          </div>
          <Link href="/browse?priced=1&sort=price_desc" className="btn-ghost text-xs shrink-0">View all →</Link>
        </div>
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {valuableCards.map((c) => (
            <div key={c.id} className="w-36 shrink-0 sm:w-44">
              <CardTile card={c} />
            </div>
          ))}
        </div>
      </section>

      {/* Most popular — what other collectors are looking at right now */}
      {popularCards.length >= 4 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">Most popular right now</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The cards collectors are checking most on DexCompare.
              </p>
            </div>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {popularCards.map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Browse by set — newest first, horizontal sliding window. Full list on /sets. */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-white">Browse by set</h2>
          <Link href="/sets" className="btn-ghost text-xs shrink-0">View all {SETS.length} sets →</Link>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {POKEMON_SETS.slice(0, 24).map((s) => (
            <Link
              key={s.code}
              href={`/sets/${s.slug}`}
              className="card-surface group flex w-40 shrink-0 flex-col items-center gap-2 p-4 transition-colors hover:border-brand-500"
            >
              <div className="flex h-14 w-full items-center justify-center">
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo} alt={s.name} loading="lazy" className="max-h-14 max-w-full object-contain transition-transform group-hover:scale-105" />
                ) : (
                  <span className="text-lg font-bold text-white">{s.code.toUpperCase()}</span>
                )}
              </div>
              <span className="line-clamp-1 text-center text-xs text-slate-400">{s.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by energy type */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-white">Browse by energy type</h2>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_KEYS.map((k) => {
            const d = domainInfo(k);
            return (
              <Link
                key={k}
                href={`/browse?domain=${k}`}
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
        <h2 className="text-xl font-extrabold text-white">Pokémon prices in {info.place}, all in one place</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          DexCompare is a free, independent price-comparison tool for the Pokémon Trading Card
          Game, built for {info.adjective} collectors and players. We track live prices for every Pokémon card across
          {" "}{info.adjective} stores{ebay ? ` and ${ebay}` : ""} so you can buy Pokémon cards in {info.place} for
          less — find the cheapest store for any single, fast.
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
