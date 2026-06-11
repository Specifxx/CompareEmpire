import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { Logo } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";
import { HeroCards } from "@/components/HeroCards";
import { CountUp } from "@/components/CountUp";
import { Partners } from "@/components/Partners";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getTopMovers } from "@/lib/trending";
import { cardTileSelect, type CardTileData } from "@/lib/cards";
import { getSelectedGames } from "@/lib/get-games";
import { GAMES, GAME_LIST } from "@/lib/games";

// Per-request: the homepage is personalised to the visitor's selected games.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TCGPriceEmpire — Compare Prices Across Every Major TCG" },
  description:
    "One price comparison for all five major trading card games — Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Riftbound. Compare TCGplayer, Cardmarket, eBay and more to find the cheapest copy of any card.",
  alternates: { canonical: "/" },
};

const FAQS = [
  {
    q: "Which trading card games does TCGPriceEmpire cover?",
    a: "All five major TCGs: Pokémon, Magic: The Gathering, Yu-Gi-Oh!, the One Piece Card Game and Riftbound (the League of Legends TCG). Pick the games you play and the whole site tailors itself to them.",
  },
  {
    q: "Which stores and marketplaces do you compare?",
    a: "TCGplayer market prices for every game, Cardmarket (EU) for Magic and Yu-Gi-Oh!, plus eBay, Amazon and CoolStuffInc comparisons where available — with direct links to buy at each vendor.",
  },
  {
    q: "How do I find the cheapest copy of a card?",
    a: "Search any card name and open its page: every vendor's live price is listed side by side, cheapest options first, so you can click straight through to the best deal.",
  },
  {
    q: "Is TCGPriceEmpire free?",
    a: "Yes — completely free, no account needed. Some outbound links earn us a small commission at no cost to you, which keeps the site running.",
  },
];

export default async function HomePage() {
  const selected = getSelectedGames();

  // One rail per selected game (chase cards), fetched once and reused for the
  // interleaved "hot across the empire" mosaic so no extra queries are needed.
  const [rails, movers, totalCards, pricedCards] = await Promise.all([
    Promise.all(
      selected.map(async (key) => ({
        game: GAMES[key],
        cards: await prisma.card
          .findMany({
            where: { game: key, kind: "single", marketPriceCents: { not: null } },
            orderBy: { marketPriceCents: "desc" },
            take: 12,
            select: cardTileSelect,
          })
          .catch(() => [] as CardTileData[]),
      }))
    ),
    getTopMovers(12).catch(() => []),
    prisma.card.count().catch(() => 0),
    prisma.card.count({ where: { marketPriceCents: { not: null } } }).catch(() => 0),
  ]);
  const hasData = totalCards > 0;

  // Round-robin interleave across the selected games — the front page must never
  // read as a single game's site, whatever the visitor plays.
  const hot: CardTileData[] = [];
  for (let i = 0; i < 4; i++) for (const r of rails) if (r.cards[i]) hot.push(r.cards[i]);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero — panning gradient, drifting card collage, count-up stats. */}
      <section className="card-surface animate-fade-up overflow-hidden">
        <div
          className="relative animate-gradient-pan px-6 py-14 text-center"
          style={{
            background:
              "linear-gradient(115deg, rgba(124,58,237,0.3), rgba(19,23,31,0.9) 35%, rgba(251,191,36,0.16) 55%, rgba(19,23,31,0.9) 75%, rgba(124,58,237,0.25))",
            backgroundSize: "220% 220%",
          }}
        >
          <HeroCards />
          <div className="relative">
            <div className="mx-auto mb-5 flex items-center justify-center">
              <span className="animate-float"><Logo size={80} /></span>
            </div>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold text-white sm:text-5xl">
              Every major TCG.
              <span className="block bg-gradient-to-r from-brand-400 via-gold to-brand-400 bg-clip-text text-transparent">
                One price empire.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
              Pokémon, Magic, Yu-Gi-Oh!, One Piece and Riftbound — compare TCGplayer, Cardmarket, eBay
              and more to find the cheapest copy of any card or sealed product.
            </p>

            {/* Game chips — entry points to the hubs (and a visual of the coverage). */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {GAME_LIST.map((g) => (
                <Link
                  key={g.key}
                  href={`/${g.slug}`}
                  className={`chip border px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5 hover:border-brand-500 ${
                    selected.includes(g.key) ? "border-brand-500/60 bg-brand-500/10" : "border-ink-700"
                  }`}
                  style={{ color: g.color }}
                >
                  {g.icon} {g.short}
                </Link>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/browse" className="btn-primary animate-pulse-glow">Browse all cards</Link>
              <Link href="/sealed" className="btn-ghost">Sealed products</Link>
            </div>

            {hasData && (
              <div className="mx-auto mt-9 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="products tracked"><CountUp value={totalCards} /></Stat>
                <Stat label="live prices"><CountUp value={pricedCards} /></Stat>
                <Stat label="games covered"><CountUp value={5} duration={600} /></Stat>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live ticker — chase cards from every game, always moving. */}
      <div className="animate-fade-up delay-1">
        <Ticker />
      </div>

      <div className="animate-fade-up delay-2">
        <Partners />
      </div>

      {/* Hot across the empire — interleaved so all games show at once. */}
      {hot.length >= 6 && (
        <section className="animate-fade-up delay-3">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">👑 Hot across the empire</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                The biggest chase cards in every game you play — side by side.
              </p>
            </div>
            <Link href="/browse" className="btn-ghost shrink-0 text-xs">Browse all →</Link>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {hot.map((c) => (
              <div key={c.id} className="w-36 shrink-0 sm:w-44">
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Biggest movers — real moving prices (appears once 2+ days of history exist). */}
      {movers.length > 0 && (
        <section className="animate-fade-up delay-3">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-white">📈 Biggest price movers</h2>
              <p className="mt-0.5 text-xs text-slate-500">The sharpest rises and falls in market price this week.</p>
            </div>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {movers.map((m) => (
              <div key={m.card.id} className="w-36 shrink-0 sm:w-44">
                <div className={`mb-1.5 text-center text-xs font-bold ${m.pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {m.pct > 0 ? "▲" : "▼"} {Math.abs(m.pct).toFixed(1)}% this week
                </div>
                <CardTile card={m.card} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed — local to this visitor; renders nothing on a first visit. */}
      <RecentlyViewed />

      {/* Game showcase — one animated panel per game, selected or not. */}
      <section className="animate-fade-up delay-4">
        <h2 className="mb-4 text-xl font-extrabold text-white">Choose your battlefield</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {GAME_LIST.map((g) => (
            <Link
              key={g.key}
              href={`/${g.slug}`}
              className="card-surface group relative overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-35"
                style={{ background: `linear-gradient(135deg, ${g.color}55, transparent 65%)` }}
              />
              <div className="relative">
                <div className="text-2xl transition-transform duration-300 group-hover:scale-125">{g.icon}</div>
                <div className="mt-2 font-extrabold text-white">{g.short}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{g.tagline}</p>
                <div className="mt-3 text-xs font-semibold" style={{ color: g.color }}>
                  Enter hub →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* One rail per selected game — the personalised deep-dive. */}
      {rails
        .filter((r) => r.cards.length >= 4)
        .map((r) => (
          <section key={r.game.key}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  {r.game.icon} {r.game.name} — top chase cards
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{r.game.tagline}</p>
              </div>
              <Link href={`/${r.game.slug}`} className="btn-ghost shrink-0 text-xs">
                {r.game.short} hub →
              </Link>
            </div>
            <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
              {r.cards.map((c) => (
                <div key={c.id} className="w-36 shrink-0 sm:w-44">
                  <CardTile card={c} showGame={false} />
                </div>
              ))}
            </div>
          </section>
        ))}

      {!hasData && (
        <section className="card-surface p-10 text-center">
          <h2 className="text-lg font-bold text-white">Catalogue import in progress</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            The five-game card database is being imported. Check back shortly — search and price
            comparisons go live the moment the first import lands.
          </p>
        </section>
      )}

      {/* About + FAQ — keyword-relevant content for search */}
      <section className="card-surface p-6">
        <h2 className="text-xl font-extrabold text-white">All your TCG prices in one place</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          TCGPriceEmpire is a free, independent price-comparison tool covering the five biggest trading
          card games. Tell us which games you play and we tailor everything to your collection — or browse
          all five at once. Live market prices, side-by-side vendor comparisons, and direct links to buy at
          the cheapest vendor.
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-900/70 p-3">
      <div className="text-xl font-extrabold text-gold">{children}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
