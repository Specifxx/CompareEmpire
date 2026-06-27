import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
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
import { NAV_SECTIONS } from "@/components/nav-sections";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SearchBar } from "@/components/SearchBar";
import { CollectionTiles } from "@/components/CollectionTiles";
import { HomeShoppableGrid } from "@/components/HomeShoppableGrid";

// ISR while AU-only; becomes dynamic per-request when NZ mode is enabled (getCountry
// then reads the country cookie).
export const revalidate = 86400;

// Market-neutral metadata (no country in the title) so search results aren't biased
// to one country — the visible page below is still tailored to the visitor's market.
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
    "Pokémon booster packs",
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
      q: "How much are my Pokémon cards worth?",
      a: `Use the free Pokémon card value checker: search any card by name and collector number to see its live market value plus real ${adjective} store prices, updated daily — from 1999 Base Set holos to the newest chase cards.`,
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
  // One cached bundle per market (5-min memo) — TTFB was the biggest PageSpeed
  // cost, and prices only move on the imports anyway. Movers and deals carry
  // their own caches.
  const [{ totalCards, pricedCards, inStockUnits, storeCount, featuredGrid, newSealed }, movers, deals] =
    await Promise.all([getHomeData(country), getTopMovers(12, country), getTopDeals(12, country)]);

  return (
    <>
      <ScrollProgress />
      <div className="flex flex-col gap-10">
        {/* ── Slim marketplace header ── */}
        <section className="card-surface animate-fade-up relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/15 via-ink-850 to-gold/10" aria-hidden />
          <div className="aurora-layer" aria-hidden>
            <span className="aurora-blob" style={{ width: 300, height: 300, left: "8%", top: "-14%", background: "#ee1515", opacity: 0.18 }} />
            <span className="aurora-blob" style={{ width: 340, height: 340, right: "6%", top: "-10%", background: "#3b5bff", opacity: 0.12, animationDelay: "-6s" }} />
          </div>

          <div className="relative px-5 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <span className="inline-flex items-center gap-2 rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400/70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Live prices · updated daily
                </span>
              </div>

              <h1 className="max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                The Pokémon card <span className="text-brand-400">price database</span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-400 sm:text-base">
                Search {totalCards.toLocaleString()} cards and compare every {info.adjective} store&apos;s live price to find the cheapest place to buy.
              </p>

              {/* Search — the primary way into the database */}
              <div className="w-full max-w-2xl">
                <Suspense fallback={<div className="input" />}>
                  <SearchBar />
                </Suspense>
              </div>

              {/* Muted quick links into the database */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { href: "/browse", label: "🃏 Browse all" },
                  { href: "/deals", label: "🔥 Deals" },
                  { href: "/card-value", label: "💰 Value checker" },
                  { href: "/sealed", label: "📦 Sealed" },
                  { href: "/sets", label: "🗂️ Sets" },
                ].map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    prefetch={false}
                    className="chip border border-ink-700 bg-ink-900 px-3 py-1 text-sm text-slate-300 outline-none transition-colors hover:border-brand-500 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>

              <CountryHeroToggle />

              {/* Thin live stats strip */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
                <Stat value={totalCards} label="cards" />
                <span className="text-ink-700" aria-hidden>·</span>
                <Stat value={pricedCards} label="priced" />
                <span className="text-ink-700" aria-hidden>·</span>
                <Stat value={inStockUnits} label="in-stock listings" />
                <span className="text-ink-700" aria-hidden>·</span>
                <Stat value={storeCount} label={`${info.code} stores`} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Explore the database (dark, low-key entry points) ── */}
        <Reveal as="section">
          <h2 className="mb-4 text-xl font-extrabold text-white sm:text-2xl">🔍 Explore the database</h2>
          <CollectionTiles />
        </Reveal>

        {/* ── Database preview grid + deep-link sort bar ── */}
        <Reveal as="section">
          <HomeShoppableGrid cards={featuredGrid} totalCards={totalCards} storeCount={storeCount} adjective={info.adjective} />
        </Reveal>

        {/* The demand magnet — what collectors are hunting right now. */}
        <Reveal><HotRightNow /></Reveal>

        {/* Today's deals — the "sale" row. */}
        {deals.length >= 4 && (
          <Reveal as="section">
            <SectionHeading
              title="🔥 Today's best deals"
              sub={`${info.adjective} store prices sitting well below the TCGplayer market guide right now.`}
              href="/deals"
              cta="All deals →"
            />
            <Carousel>
              {deals.map((d) => (
                <div key={d.card.id} className="w-36 shrink-0 snap-start sm:w-44">
                  <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold">
                    <span className="text-emerald-400">▼ {d.pct}%</span>
                    <span className="text-slate-500 line-through">{formatMoney(d.guideCents, info.currency)}</span>
                  </div>
                  <CardTile card={d.card} />
                </div>
              ))}
            </Carousel>
          </Reveal>
        )}

        {/* TCGplayer affiliate banner */}
        <TcgplayerAd size="billboard" mobile="rect" country={country} />

        {/* Biggest price movers — marketplace volatility row. */}
        {movers.length > 0 && (
          <Reveal as="section">
            <SectionHeading
              title="📈 Biggest price movers"
              sub={`The sharpest rises and falls in the cheapest ${info.adjective} price over the last week.`}
            />
            <Carousel>
              {movers.map((m) => (
                <div key={m.card.id} className="w-36 shrink-0 snap-start sm:w-44">
                  <div className={`mb-1.5 text-center text-xs font-bold ${m.pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {m.pct > 0 ? "▲" : "▼"} {Math.abs(m.pct).toFixed(1)}% this week
                  </div>
                  <CardTile card={m.card} />
                </div>
              ))}
            </Carousel>
          </Reveal>
        )}

        {/* New sealed arrivals — Shopify "new products" row. */}
        {newSealed.length >= 3 && (
          <Reveal as="section">
            <SectionHeading
              title="🆕 New sealed arrivals"
              sub={`The newest booster boxes, ETBs & bundles — compare every ${info.adjective} store to find the cheapest place to buy (or the best resale value).`}
              href="/sealed"
              cta="View all →"
            />
            <Carousel>
              {newSealed.map((g) => (
                <div key={g.slug} className="w-40 shrink-0 snap-start sm:w-44">
                  <SealedTile group={g} currency={info.currency} />
                </div>
              ))}
            </Carousel>
          </Reveal>
        )}

        {/* Recently viewed — local to this visitor; renders nothing on a first visit */}
        <RecentlyViewed />

        {/* Official partner programs — credibility strip (approved affiliates). */}
        <Reveal><Partners country={country} /></Reveal>

        {/* ── Discovery + SEO content below the shop ── */}

        {/* Browse by set */}
        <Reveal as="section">
          <SectionHeading title="🗂️ Browse by set" href="/sets" cta={`View all ${SETS.length} sets →`} />
          <Carousel gap="gap-3">
            {POKEMON_SETS.slice(0, 24).map((s) => (
              <Link
                key={s.code}
                href={`/sets/${s.slug}`}
                className="card-surface lift group flex w-40 shrink-0 snap-start flex-col items-center gap-2 p-4"
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
          </Carousel>
        </Reveal>

        {/* Browse by energy type */}
        <Reveal as="section">
          <h2 className="mb-4 text-xl font-extrabold text-white sm:text-2xl">⚡ Browse by energy type</h2>
          <div className="flex flex-wrap gap-2">
            {DOMAIN_KEYS.map((k, i) => {
              const d = domainInfo(k);
              return (
                <Reveal key={k} delay={i * 50}>
                  <Link
                    href={`/browse?domain=${k}`}
                    className="chip border border-ink-700 px-3 py-1.5 text-sm outline-none transition-colors hover:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-400"
                    style={{ color: d.color }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.label}
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Reveal>

        {/* Tools & community */}
        <Reveal as="section">
          <h2 className="mb-4 text-xl font-extrabold text-white sm:text-2xl">🧰 Tools &amp; community</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {NAV_SECTIONS.filter((s) => s.label === "My stuff" || s.label === "Play & tools")
              .flatMap((s) => s.links)
              .map((l, i) => (
                <Reveal key={l.href} delay={i * 50}>
                  <Link href={l.href} className="card-surface lift flex items-center gap-3 p-4">
                    <span className="text-2xl" aria-hidden>{l.icon}</span>
                    <span className="font-semibold text-white">{l.label}</span>
                  </Link>
                </Reveal>
              ))}
          </div>
        </Reveal>

        {/* About + FAQ */}
        <Reveal as="section" className="card-surface p-6">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">Pokémon prices in {info.place}, all in one place</h2>
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
        </Reveal>

        {/* Second TCGplayer banner */}
        <TcgplayerAd size="leaderboard" country={country} />

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
    </>
  );
}

// Thin live stat: real number always in the DOM (SEO), animated on scroll.
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-extrabold text-gold"><CountUp value={value} /></span>{" "}
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  );
}

// Consistent section header with an accent bar + optional "view all" link.
function SectionHeading({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-brand-400 to-gold" aria-hidden />
          {title}
        </h2>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="btn-ghost shrink-0 text-xs">{cta}</Link>
      )}
    </div>
  );
}

// Horizontal snap carousel with faded scroll edges.
function Carousel({ children, gap = "gap-4" }: { children: ReactNode; gap?: string }) {
  return (
    <div className={`edge-fade snap-x-mandatory -mx-1 flex ${gap} overflow-x-auto px-1 pb-2`}>
      {children}
    </div>
  );
}
