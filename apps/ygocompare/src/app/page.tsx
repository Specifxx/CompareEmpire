import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { HotRightNow } from "@/components/HotRightNow";
import { Partners } from "@/components/Partners";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { getTopMovers } from "@/lib/trending";
import { getHomeData } from "@/lib/home-data";
import { getTopDeals } from "@/lib/deals";
import { formatMoney } from "@/lib/format";
import { SealedTile } from "@/components/SealedTile";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES, type CountryInfo } from "@/lib/country";
import { SETS, domainInfo, DOMAIN_KEYS } from "@/lib/constants";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { Logo } from "@/components/Logo";

export const revalidate = 180;

export const metadata: Metadata = {
  title: { absolute: "Buy & Compare Yu-Gi-Oh! Card Prices | YGOCompare" },
  description:
    "Compare live Yu-Gi-Oh! card prices across stores in Australia, New Zealand, the United States and the United Kingdom, and find the cheapest place to buy Yu-Gi-Oh! singles. Updated daily.",
  keywords: [
    "buy Yu-Gi-Oh! cards",
    "Yu-Gi-Oh! prices",
    "Yu-Gi-Oh! card value",
    "Yu-Gi-Oh! card price checker",
    "compare Yu-Gi-Oh! prices",
    "cheapest Yu-Gi-Oh! singles",
    "Yu-Gi-Oh! the Gathering singles",
    "Yu-Gi-Oh! card prices",
  ],
  alternates: { canonical: "/" },
};

function ebayLabel(country: string): string | null {
  return country === "AU" ? "eBay AU" : country === "US" ? "eBay US" : country === "GB" ? "eBay UK" : null;
}

function faqsFor(info: CountryInfo, ebay: string | null): { q: string; a: string }[] {
  const { adjective, place, currency } = info;
  return [
    {
      q: `Where can I buy Yu-Gi-Oh! cards in ${place}?`,
      a: `YGOCompare compares live Yu-Gi-Oh! prices across a wide range of ${adjective} stores${ebay ? ` plus ${ebay}` : ""}, so you can buy Yu-Gi-Oh! singles from whichever shop is cheapest. Search any card to see every store's price and click straight through to buy.`,
    },
    {
      q: `How do I find the cheapest Yu-Gi-Oh! prices in ${place}?`,
      a: `Search or browse the card database and each card shows the lowest live price across ${adjective} stores, ranked by total delivered cost (item plus shipping). It's the fastest way to find the cheapest Yu-Gi-Oh! cards in ${place}.`,
    },
    {
      q: "What does YGOCompare track?",
      a: `YGOCompare covers a growing database of Yu-Gi-Oh! singles — from 2002 Legend of Blue Eyes to the newest core set — each priced live across ${adjective} retailers so you can always find the cheapest place to buy.`,
    },
    {
      q: "How much are my Yu-Gi-Oh! cards worth?",
      a: `Use the free Yu-Gi-Oh! card value checker: search any card by name and set to see its live market value plus real ${adjective} store prices, updated daily — from a 2002 Blue-Eyes to the latest Quarter Century Secret Rares.`,
    },
    {
      q: `Are the prices shown in ${currency}?`,
      a: `Yes. Every price is the live ${adjective} price in ${currency}, so there are no surprise currency conversions — what you see is what you pay locally.`,
    },
  ];
}

export default async function HomePage() {
  const country = getCountry();
  const info = COUNTRIES[country];
  const ebay = ebayLabel(country);
  const faqs = faqsFor(info, ebay);
  const [{ totalCards, pricedCards, inStockUnits, cheapestCards, valuableCards, storeCount, popularCards, newSealed }, movers, deals] =
    await Promise.all([getHomeData(country), getTopMovers(12, country), getTopDeals(12, country)]);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="card-surface animate-fade-up overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <span className="animate-float"><Logo size={76} /></span>
          </div>
          <h1 className="mx-auto max-w-3xl text-2xl font-extrabold text-white sm:text-4xl">
            Compare Yu-Gi-Oh! card prices across {info.adjective} stores
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Find the cheapest place to buy Yu-Gi-Oh! singles in {info.place} — live prices in{" "}
            {info.currency} compared across {storeCount} {info.adjective} stores, updated daily.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn-primary">Browse the database</Link>
          </div>

          <CountryHeroToggle />

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat value={totalCards.toLocaleString()} label="cards" />
            <Stat value={pricedCards.toLocaleString()} label="priced" />
            <Stat value={inStockUnits.toLocaleString()} label="in-stock listings" />
            <Stat value={String(storeCount)} label={`${info.code} stores`} />
          </div>
        </div>
      </section>

      <HotRightNow />

      {/* Official partner programs — credibility strip (approved affiliates). */}
      <Partners country={country} />

      {newSealed.length >= 3 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">🔥 Sealed product deals</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Play boosters, collector boosters, bundles &amp; Commander decks — compare every {info.adjective} store to find
                the cheapest place to buy.
              </p>
            </div>
            <Link href="/sealed" className="btn-ghost text-xs shrink-0">View all →</Link>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {newSealed.map((g) => (
              <div key={g.slug} className="w-40 shrink-0 sm:w-44">
                <SealedTile group={g} currency={info.currency} />
              </div>
            ))}
          </div>
        </section>
      )}

      {deals.length >= 4 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">🔥 Today&apos;s best deals</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {info.adjective} store prices sitting well below the market guide right now.
              </p>
            </div>
            <Link href="/deals" className="btn-ghost text-xs shrink-0">All deals →</Link>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {deals.map((d) => (
              <div key={d.card.id} className="w-36 shrink-0 sm:w-44">
                <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
                  <span className="text-emerald-400">▼ {d.pct}%</span>
                  <span className="text-slate-500 line-through">{formatMoney(d.guideCents, info.currency)}</span>
                </div>
                <CardTile card={d.card} />
              </div>
            ))}
          </div>
        </section>
      )}

      <TcgplayerAd size="billboard" mobile="rect" country={country} />

      <RecentlyViewed />

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

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Cheapest Yu-Gi-Oh! cards</h2>
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

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Most valuable cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The biggest chase cards by market value — Blue-Eyes, Dark Magician, meta staples and Ghost Rares.
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

      {popularCards.length >= 4 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">Most popular right now</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The cards collectors are checking most on YGOCompare.
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

      <TcgplayerAd size="leaderboard" country={country} />

      {/* Browse by set */}
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
                <span className="text-lg font-bold text-white">{s.code.toUpperCase()}</span>
              </div>
              <span className="line-clamp-1 text-center text-xs text-slate-400">{s.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by attribute */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-white">Browse by attribute</h2>
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

      {/* About + FAQ */}
      <section className="card-surface p-6">
        <h2 className="text-xl font-extrabold text-white">Yu-Gi-Oh! prices in {info.place}, all in one place</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          YGOCompare is a free, independent price-comparison tool for Yu-Gi-Oh!, built for {info.adjective} players and collectors. We track live prices for Yu-Gi-Oh! singles across
          {" "}{info.adjective} stores{ebay ? ` and ${ebay}` : ""} so you can buy Yu-Gi-Oh! cards in {info.place} for
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
