import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CountryHeroToggle } from "@/components/CountryHeroToggle";
import { getHomeData } from "@/lib/home-data";
import { getTopDeals, type Deal } from "@/lib/deals";
import { DealsRail } from "@/components/DealsRail";
import { HeroStats } from "@/components/HeroStats";
import { COUNTRY_LIST, type Country } from "@/lib/country";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";
import { Reveal } from "@/components/Reveal";
import { SETS, DOMAIN_KEYS, domainInfo } from "@/lib/constants";

// REAL ISR: this page renders a market-NEUTRAL baseline (no cookie/header
// reads — copy names all four markets, data fetched for the AU baseline) so
// Google indexes one coherent global page and every visitor gets fast cached
// HTML. Client components (CardTile, CountryHeroToggle, SearchBar) localise
// prices to the visitor's market after hydration via CountryProvider.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Buy & Compare Pokémon Card Prices | DexCompare" },
  description:
    "Compare live Pokémon card prices across AU, US and UK stores, plus eBay, and find the cheapest place to buy every card. Updated daily.",
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

// MARKET-NEUTRAL FAQs: Googlebot crawls from US IPs and this page is cached,
// so exactly one version is ever indexed/served — copy that names all three
// markets ranks in all three, and the country names double as keywords.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Where can I buy Pokémon cards online?",
    a: "DexCompare compares live Pokémon prices across a wide range of local stores in Australia, the US and the UK, plus eBay (AU, US and UK), so you can buy Pokémon cards from whichever shop is cheapest. Search any card to see every store's price and click straight through to buy.",
  },
  {
    q: "How do I find the cheapest Pokémon card prices?",
    a: "Search or browse the card database — every card shows the lowest live price across the stores in your market, ranked by total delivered cost (item plus shipping). It's the fastest way to find the cheapest Pokémon cards wherever you are.",
  },
  {
    q: "How many Pokémon cards does DexCompare track?",
    a: "DexCompare covers a comprehensive database of Pokémon singles, each priced live across local retailers so you can always find the cheapest place to buy.",
  },
  {
    q: "How much are my Pokémon cards worth?",
    a: "Use the free Pokémon card value checker: search any card by name and collector number to see its live market value plus real store prices, updated daily.",
  },
  {
    q: "Are the Pokémon prices shown in my local currency?",
    a: "Yes. Prices are shown in the local currency of your selected market — AUD in Australia, USD in the US and GBP in the UK — so there are no surprise currency conversions.",
  },
];

export default async function HomePage() {
  // Market-neutral cached render: every market's numbers ship in the payload and
  // client islands (HeroStats, DealsRail, CardTile) pick the visitor's.
  // Never let a DB hiccup fail this prerender outright — an empty homepage
  // render (retried on the next ISR revalidation) beats taking the whole
  // build down, the exact failure mode that broke production before.
  // Deals are fetched for EVERY market, not just the AU baseline: the cached HTML
  // can't vary by cookie, so the client island picks the active region's list. Each
  // call is a take-capped read of the precomputed ~400-row Deal table, cached per
  // market — three of them cost far less than one catalogue scan.
  const [{ totalCards, inStockByMarket, storeCountByMarket }, ...dealLists] = await Promise.all([
    getHomeData().catch(() => ({
      totalCards: 0,
      inStockByMarket: { AU: 0, US: 0, GB: 0 },
      storeCountByMarket: { AU: 0, US: 0, GB: 0 },
    })),
    ...COUNTRY_LIST.map((c) => getTopDeals(12, c.code).catch(() => [] as Deal[])),
  ]);
  const dealsByMarket: Partial<Record<Country, Deal[]>> = {};
  COUNTRY_LIST.forEach((c, i) => {
    dealsByMarket[c.code] = dealLists[i] ?? [];
  });

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
                Search <span className="num text-slate-300">{totalCards.toLocaleString()}</span> cards and compare live prices across Australian, US and UK stores to find the cheapest place to buy.
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

              {/* Thin credibility stats — client island so the listing count and
                  the store count/label follow the visitor's chosen market. */}
              <HeroStats
                totalCards={totalCards}
                inStockByMarket={inStockByMarket}
                storeCountByMarket={storeCountByMarket}
              />
            </div>
          </div>
        </section>

        {/* ── How it works ── DexCompare opened straight into card grids with no
            explanation of what the site does — this is the missing "why". */}
        <section className="grid gap-3 sm:grid-cols-3">
          <HowItWorksStep n={1} title="Search" desc="Find any Pokémon card by name, set or collector number." icon="🔍" />
          <HowItWorksStep n={2} title="Compare every store" desc="See the live price at every store we track, ranked by total delivered cost." icon="⚖️" />
          <HowItWorksStep n={3} title="Buy for the best price" desc="Click straight through to the cheapest store and buy — no middleman." icon="🛒" />
        </section>

        {/* ── Partner trust badges ── TCGplayer leads (the sell-side reference
            price on every card page); eBay stays as an affiliate search partner. */}
        <section className="card-surface flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prices sourced with</span>
          <span className="text-lg font-extrabold text-white">TCGplayer</span>
          <span className="text-ink-700" aria-hidden>·</span>
          <span className="text-lg font-extrabold">
            <span className="text-[#e53238]">e</span><span className="text-[#0064d2]">b</span><span className="text-[#f5af02]">a</span><span className="text-[#86b817]">y</span>
          </span>
          <span className="text-[11px] text-slate-500">
            DexCompare is an independent price comparison site and eBay Partner Network / TCGplayer affiliate — we earn from qualifying purchases at no extra cost to you.
          </span>
        </section>

        {/* ── One highlight: today's best deals ──
            Client island: it holds every market's deal list and renders the one
            matching the visitor's region, because a deal is a per-market
            SELECTION (which cards, what %, which converted guide) and not
            something CardTile can re-derive from a price column. */}
        <DealsRail dealsByMarket={dealsByMarket} />

        {/* ── Browse by set ──
            Ported from RiftCompare's homepage. Beyond matching the look this is
            a real internal-linking win: it points the site's highest-authority
            page straight at the set pages, which otherwise only got a link from
            the nav. Capped at the newest 10 — RiftCompare lists all of its sets
            because it has a handful; Pokémon has 173, and dumping every one here
            would bloat the page and dilute the link equity it's meant to pass. */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
              <span aria-hidden>🗂️</span>
              Browse by set
            </h2>
            <Link href="/sets" className="btn-ghost shrink-0 text-xs">All {SETS.length} sets →</Link>
          </div>
          <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SETS.slice(0, 10).map((s) => (
              <Link
                key={s.code}
                href={`/sets/${s.slug}`}
                className="card-surface flex flex-col gap-1 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-brand-500 hover:shadow-glow"
              >
                <span className="text-lg font-bold uppercase text-white">{s.code}</span>
                <span className="text-xs text-slate-400">{s.name}</span>
              </Link>
            ))}
          </Reveal>
        </section>

        {/* ── Browse by energy type ──
            DexCompare's equivalent of RiftCompare's "Browse by domain" chips.
            RiftCompare links to dedicated /domains/[key] hub pages; DexCompare
            has no such route, so these point at the pre-filtered browse view —
            same crawlable internal links, no new pages to build. */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
            <span aria-hidden>⚡</span>
            Browse by energy type
          </h2>
          <Reveal className="flex flex-wrap gap-2">
            {DOMAIN_KEYS.map((k) => {
              const d = domainInfo(k);
              return (
                <Link
                  key={k}
                  href={`/browse?domain=${encodeURIComponent(k)}`}
                  className="chip border border-ink-700 px-3 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-brand-500"
                  style={{ color: d.color }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label}
                </Link>
              );
            })}
          </Reveal>
        </section>

        {/* ── About + FAQ (SEO) ── */}
        <section className="card-surface p-6">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">Pokémon prices in Australia, the US &amp; UK — all in one place</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            DexCompare is a free, independent price-comparison tool for the Pokémon Trading Card Game. We track live prices
            for every Pokémon card across local stores in Australia, the US and the UK, plus eBay (AU, US and
            UK), so you can buy Pokémon cards for less — find the cheapest store for any single, fast.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
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

function HowItWorksStep({ n, title, desc, icon }: { n: number; title: string; desc: string; icon: string }) {
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

// Thin live stat: real number always in the DOM (SEO), animated on scroll.
