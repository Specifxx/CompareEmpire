import type { Metadata } from "next";
import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { HotRightNow } from "@/components/HotRightNow";
import { Partners } from "@/components/Partners";
import { TcgplayerAd } from "@/components/TcgplayerAd";
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
import { ScrollReveal } from "@/components/ScrollReveal";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Buy & Compare One Piece Card Game Card Prices | OPCompare" },
  description:
    "Compare live One Piece Card Game card prices across stores in Australia, New Zealand, the United States and the United Kingdom, and find the cheapest place to buy One Piece singles. Updated daily.",
  keywords: [
    "buy One Piece cards",
    "One Piece prices",
    "One Piece card value",
    "One Piece card price checker",
    "compare One Piece prices",
    "cheapest One Piece singles",
    "One Piece the Gathering singles",
    "One Piece card prices",
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
      q: `Where can I buy One Piece cards in ${place}?`,
      a: `OPCompare compares live One Piece prices across a wide range of ${adjective} stores${ebay ? ` plus ${ebay}` : ""}, so you can buy One Piece Card Game singles from whichever shop is cheapest. Search any card to see every store's price and click straight through to buy.`,
    },
    {
      q: `How do I find the cheapest One Piece prices in ${place}?`,
      a: `Search or browse the card database and each card shows the lowest live price across ${adjective} stores, ranked by total delivered cost (item plus shipping). It's the fastest way to find the cheapest One Piece cards in ${place}.`,
    },
    {
      q: "What does OPCompare track?",
      a: `OPCompare covers a growing database of One Piece Card Game singles — from OP01 Romance Dawn to the newest set — each priced live across ${adjective} retailers so you can always find the cheapest place to buy.`,
    },
    {
      q: "How much are my One Piece cards worth?",
      a: `Use the free One Piece card value checker: search any card by name and set to see its live market value plus real ${adjective} store prices, updated daily — from OP01 chase cards to the latest Secret Rares.`,
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
  const [{ totalCards, pricedCards, inStockUnits, cheapestCards, valuableCards, storeCount, popularCards, newSealed }, deals] =
    await Promise.all([getHomeData(country), getTopDeals(12, country)]);

  return (
    <div className="flex flex-col gap-10">
      <ScrollReveal />
      {/* Hero — the Grand Line */}
      <section className="card-surface animate-fade-up relative overflow-hidden">
        <div className="grandline-sky relative px-6 py-16 text-center">
          {/* Floating pirate props (decorative). */}
          <span className="hero-prop left-[5%] top-[16%] text-4xl animate-bob sm:text-5xl" aria-hidden>🏴‍☠️</span>
          <span className="hero-prop right-[7%] top-[12%] text-4xl animate-bob-slow sm:text-5xl" aria-hidden>👒</span>
          <span className="hero-prop left-[11%] bottom-[24%] text-3xl animate-float sm:text-4xl" aria-hidden>🧭</span>
          <span className="hero-prop right-[11%] bottom-[28%] text-3xl animate-bob sm:text-4xl" aria-hidden>⚓</span>
          <span className="hero-prop left-[46%] top-[6%] text-2xl animate-float sm:text-3xl" aria-hidden>🍖</span>

          <div className="relative z-10">
            <div className="mx-auto mb-5 flex items-center justify-center">
              <span className="animate-pulse-glow rounded-full"><Logo size={84} /></span>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-accent">⚓ Set sail on the Grand Line</p>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold sm:text-5xl">
              <span className="text-grandline">Compare One Piece card prices</span>
              <span className="mt-1 block text-xl text-white/90 sm:text-3xl">across {info.adjective} stores</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-200/90 sm:text-base">
              Find the cheapest place to buy One Piece singles in {info.place} — live prices in{" "}
              {info.currency} compared across {storeCount} {info.adjective} stores, updated daily.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/browse" className="btn-accent shadow-treasure text-base">🗺️ Browse the database</Link>
              <Link href="/deals" className="btn-ghost">🔥 Today&apos;s deals</Link>
            </div>

            <CountryHeroToggle />

            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat value={totalCards.toLocaleString()} label="cards" />
              <Stat value={pricedCards.toLocaleString()} label="priced" />
              <Stat value={inStockUnits.toLocaleString()} label="in-stock listings" />
              <Stat value={String(storeCount)} label={`${info.code} stores`} />
            </div>
          </div>

          {/* Ocean waves drifting across the bottom of the hero. */}
          <div className="ocean-waves" aria-hidden>
            <div className="wave-layer wave-back animate-wave-slow" />
            <div className="wave-layer wave-front animate-wave" />
          </div>
        </div>
      </section>

      {/* How it works — the homepage opened straight into card grids with no
          explanation of what the site actually does for a first-time visitor. */}
      <section className="reveal grid gap-3 sm:grid-cols-3">
        <HowItWorksStep n={1} icon="🔍" title="Search" desc="Find any One Piece card by name, set or card number." />
        <HowItWorksStep n={2} icon="⚖️" title="Compare every store" desc="See the live price at every store we track, ranked by total delivered cost." />
        <HowItWorksStep n={3} icon="🛒" title="Buy for the best price" desc="Click straight through to the cheapest store — no middleman, no markup." />
      </section>

      <div className="reveal"><HotRightNow /></div>

      {/* Official partner programs — credibility strip (approved affiliates). */}
      <div className="reveal"><Partners country={country} /></div>

      {newSealed.length >= 3 && (
        <section className="reveal">
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
        <section className="reveal">
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

      <div className="reveal"><RecentlyViewed /></div>


      <section className="reveal">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Cheapest One Piece cards</h2>
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

      <section className="reveal">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white">Most valuable cards</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              The biggest chase cards by market value — Leaders, alt-art Super Rares, Secret Rares and more.
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
        <section className="reveal">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">Most popular right now</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The cards collectors are checking most on OPCompare.
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
      <section className="reveal">
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

      {/* Browse by color */}
      <section className="reveal">
        <h2 className="mb-4 text-xl font-extrabold text-white">Browse by color</h2>
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
      <section className="card-surface reveal p-6">
        <h2 className="text-xl font-extrabold text-white">One Piece prices in {info.place}, all in one place</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          OPCompare is a free, independent price-comparison tool for One Piece Card Game, built for {info.adjective} players and collectors. We track live prices for One Piece singles across
          {" "}{info.adjective} stores{ebay ? ` and ${ebay}` : ""} so you can buy One Piece cards in {info.place} for
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

function HowItWorksStep({ n, icon, title, desc }: { n: number; icon: string; title: string; desc: string }) {
  return (
    <div className="card-surface flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-extrabold text-brand-300">{n}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span aria-hidden>{icon}</span> {title}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-ink-950/40 p-3 ring-1 ring-white/10 backdrop-blur-sm transition-transform hover:-translate-y-0.5">
      <div className="text-xl font-extrabold text-gold drop-shadow-[0_1px_6px_rgba(253,224,71,0.35)]">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-300/80">{label}</div>
    </div>
  );
}
