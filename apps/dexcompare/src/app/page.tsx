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
  // One cached bundle per market (5-min revalidate) — TTFB was the biggest
  // PageSpeed cost, and prices only move on the imports anyway. Movers and
  // deals carry their own caches.
  const [{ totalCards, pricedCards, inStockUnits, cheapestCards, valuableCards, storeCount, popularCards, newSealed }, movers, deals] =
    await Promise.all([getHomeData(country), getTopMovers(12, country), getTopDeals(12, country)]);

  return (
    <>
      <ScrollProgress />
      <div className="flex flex-col gap-10">
        {/* ── Hero: animated aurora + count-up stats + search-forward ── */}
        <section className="card-surface animate-fade-up relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-ink-850 to-gold/10" aria-hidden />
          <div className="aurora-layer" aria-hidden>
            <span className="aurora-blob" style={{ width: 380, height: 380, left: "6%", top: "-12%", background: "#ee1515", opacity: 0.5 }} />
            <span className="aurora-blob" style={{ width: 440, height: 440, right: "4%", top: "-6%", background: "#ffcb05", opacity: 0.32, animationDelay: "-6s" }} />
            <span className="aurora-blob" style={{ width: 320, height: 320, left: "42%", top: "18%", background: "#ff4d4d", opacity: 0.28, animationDelay: "-12s" }} />
          </div>

          <div className="relative px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-5 flex items-center justify-center">
              <span className="animate-float"><Logo size={84} /></span>
            </div>

            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live prices · updated daily
            </div>

            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Compare{" "}
              <span className="text-gradient animate-gradient-pan">Pokémon card prices</span>{" "}
              across {info.adjective} stores
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              Find the cheapest place to buy Pokémon TCG cards in {info.place} — live prices in{" "}
              {info.currency} compared across {storeCount} {info.adjective} stores, updated daily.
            </p>

            {/* Search-forward: the database is the product — let visitors dive straight in. */}
            <div className="mx-auto mt-6 flex max-w-xl justify-center">
              <Suspense fallback={<div className="input" />}>
                <SearchBar />
              </Suspense>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/browse" className="btn-primary">Browse the database</Link>
              <Link href="/deals" className="btn-ghost">🔥 Today&apos;s deals</Link>
            </div>

            {/* Country / market toggle */}
            <CountryHeroToggle />

            {/* Stats — count up when they scroll into view */}
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              <HeroStat value={totalCards} label="cards" delay={0} />
              <HeroStat value={pricedCards} label="priced" delay={80} />
              <HeroStat value={inStockUnits} label="in-stock listings" delay={160} />
              <HeroStat value={storeCount} label={`${info.code} stores`} delay={240} />
            </div>
          </div>
        </section>

        {/* The demand magnet — what collectors are hunting right now. */}
        <Reveal><HotRightNow /></Reveal>

        {/* Official partner programs — credibility strip (approved affiliates). */}
        <Reveal><Partners country={country} /></Reveal>

        {/* New sealed arrivals */}
        {newSealed.length >= 3 && (
          <Reveal as="section">
            <SectionHeading
              title="🔥 New sealed arrivals"
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

        {/* Today's deals — live store prices well below the TCGplayer market guide. */}
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

        {/* Recently viewed — local to this visitor; renders nothing on a first visit */}
        <RecentlyViewed />

        {/* Biggest price movers */}
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

        {/* Cheapest cards */}
        <Reveal as="section">
          <SectionHeading
            title="💸 Cheapest Pokémon cards"
            sub={`The lowest live prices right now — we check ${storeCount} ${info.adjective} stores for every card so you always pay the least.`}
            href="/browse?priced=1&sort=price_asc"
            cta="View all →"
          />
          <Carousel>
            {cheapestCards.map((c) => (
              <div key={c.id} className="w-36 shrink-0 snap-start sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </Carousel>
        </Reveal>

        {/* Most valuable cards */}
        <Reveal as="section">
          <SectionHeading
            title="💎 Most valuable cards"
            sub="The biggest chase cards by market value — Charizards, alt-arts, vintage holos and more."
            href="/browse?priced=1&sort=price_desc"
            cta="View all →"
          />
          <Carousel>
            {valuableCards.map((c) => (
              <div key={c.id} className="w-36 shrink-0 snap-start sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </Carousel>
        </Reveal>

        {/* Most popular */}
        {popularCards.length >= 4 && (
          <Reveal as="section">
            <SectionHeading title="🔎 Most popular right now" sub="The cards collectors are checking most on DexCompare." />
            <Carousel>
              {popularCards.map((c) => (
                <div key={c.id} className="w-36 shrink-0 snap-start sm:w-44">
                  <CardTile card={c} />
                </div>
              ))}
            </Carousel>
          </Reveal>
        )}

        {/* Second TCGplayer banner */}
        <TcgplayerAd size="leaderboard" country={country} />

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

// Hero stat tile with a scroll-triggered count-up.
function HeroStat({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <Reveal delay={delay} zoom className="rounded-xl border border-ink-700/60 bg-ink-900/70 p-3">
      <div className="text-xl font-extrabold text-gold sm:text-2xl">
        <CountUp value={value} />
      </div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
    </Reveal>
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
