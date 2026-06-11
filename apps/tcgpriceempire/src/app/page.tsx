import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { Logo } from "@/components/Logo";
import { cardTileSelect } from "@/lib/cards";
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

  // One rail per selected game: the biggest chase cards (market price desc).
  const rails = await Promise.all(
    selected.map(async (key) => ({
      game: GAMES[key],
      cards: await prisma.card.findMany({
        where: { game: key, kind: "single", marketPriceCents: { not: null } },
        orderBy: { marketPriceCents: "desc" },
        take: 12,
        select: cardTileSelect,
      }),
    }))
  );

  const [totalCards, pricedCards] = await Promise.all([
    prisma.card.count(),
    prisma.card.count({ where: { marketPriceCents: { not: null } } }),
  ]);
  const hasData = totalCards > 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="card-surface animate-fade-up overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <span className="animate-float"><Logo size={76} /></span>
          </div>
          <h1 className="mx-auto max-w-3xl text-2xl font-extrabold text-white sm:text-4xl">
            Every major TCG. One price comparison.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Pokémon, Magic, Yu-Gi-Oh!, One Piece and Riftbound — compare TCGplayer, Cardmarket, eBay and
            more to find the cheapest copy of any card or sealed product.
          </p>

          {/* Game chips — entry points to the hubs (and a visual of the coverage). */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {GAME_LIST.map((g) => (
              <Link
                key={g.key}
                href={`/${g.slug}`}
                className={`chip border px-3 py-1.5 text-sm transition-colors hover:border-brand-500 ${
                  selected.includes(g.key) ? "border-brand-500/60 bg-brand-500/10" : "border-ink-700"
                }`}
                style={{ color: g.color }}
              >
                {g.icon} {g.short}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn-primary">Browse all cards</Link>
            <Link href="/sealed" className="btn-ghost">Sealed products</Link>
          </div>

          {hasData && (
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat value={totalCards.toLocaleString()} label="products tracked" />
              <Stat value={pricedCards.toLocaleString()} label="live prices" />
              <Stat value="5" label="games covered" />
            </div>
          )}
        </div>
      </section>

      {/* One rail per selected game — chase cards first. */}
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-ink-900/70 p-3">
      <div className="text-xl font-extrabold text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
