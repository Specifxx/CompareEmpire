import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { cardTileSelect, type CardTileData } from "@/lib/cards";
import { GAME_LIST, gameBySlug } from "@/lib/games";

// One SEO hub per game (/pokemon, /magic, /yugioh, /one-piece, /riftbound):
// chase cards, newest sets, sealed — each section links into the filtered browse.
export const revalidate = 3600;

export function generateStaticParams() {
  return GAME_LIST.map((g) => ({ game: g.slug }));
}
export const dynamicParams = false; // anything else → 404

export function generateMetadata({ params }: { params: { game: string } }): Metadata {
  const game = gameBySlug(params.game);
  if (!game) return { title: "Game not found" };
  const title = `${game.name} card prices & price comparison`;
  return {
    title,
    description: game.seoDescription,
    alternates: { canonical: `/${game.slug}` },
    openGraph: { type: "website", title, description: game.seoDescription },
  };
}

export default async function GameHubPage({ params }: { params: { game: string } }) {
  const game = gameBySlug(params.game);
  if (!game) notFound();

  // Resilient to an empty/unreachable DB (first deploy, build-time prerender):
  // the hub renders its shell and fills in on the next revalidate.
  const [chase, newest, sealed, totalCards, pricedCards, sets] = await Promise.all([
    prisma.card.findMany({
      where: { game: game.key, kind: "single", marketPriceCents: { not: null } },
      orderBy: { marketPriceCents: "desc" },
      take: 12,
      select: cardTileSelect,
    }),
    prisma.card.findMany({
      where: { game: game.key, kind: "single", marketPriceCents: { not: null }, releaseDate: { not: null } },
      orderBy: [{ releaseDate: "desc" }, { marketPriceCents: "desc" }],
      take: 12,
      select: cardTileSelect,
    }),
    prisma.card.findMany({
      where: { game: game.key, kind: "sealed", marketPriceCents: { not: null } },
      orderBy: { marketPriceCents: "desc" },
      take: 12,
      select: cardTileSelect,
    }),
    prisma.card.count({ where: { game: game.key } }),
    prisma.card.count({ where: { game: game.key, marketPriceCents: { not: null } } }),
    // Most recent sets for the set-browse strip.
    prisma.card.groupBy({
      by: ["setName"],
      where: { game: game.key, kind: "single" },
      _max: { releaseDate: true },
      orderBy: { _max: { releaseDate: "desc" } },
      take: 16,
    }),
  ]).catch(
    () => [[], [], [], 0, 0, []] as [CardTileData[], CardTileData[], CardTileData[], number, number, { setName: string }[]]
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="card-surface overflow-hidden">
        <div
          className="relative px-6 py-10"
          style={{ background: `linear-gradient(135deg, ${game.color}22, transparent 55%)` }}
        >
          <div className="text-3xl">{game.icon}</div>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{game.name} price comparison</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{game.seoDescription}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/browse?game=${game.key}`} className="btn-primary">Browse all {game.short} cards</Link>
            <Link href={`/browse?game=${game.key}&kind=sealed`} className="btn-ghost">Sealed products</Link>
          </div>
          {totalCards > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              <strong className="text-slate-300">{totalCards.toLocaleString()}</strong> products tracked ·{" "}
              <strong className="text-slate-300">{pricedCards.toLocaleString()}</strong> with live prices
            </p>
          )}
        </div>
      </section>

      {game.specialist && (
        <a
          href={game.specialist.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-surface flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-white">
              In Australia, NZ, the US or the UK? Get store-by-store prices.
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Our specialist site {game.specialist.name} does {game.specialist.blurb}.
            </p>
          </div>
          <span className="btn-primary shrink-0">Open {game.specialist.name} →</span>
        </a>
      )}

      {chase.length >= 4 && (
        <Rail title={`Top ${game.short} chase cards`} href={`/browse?game=${game.key}`} cards={chase} />
      )}

      <AdSlot slot={ADSENSE_SLOTS.browse} format="horizontal" height={90} />

      {newest.length >= 4 && (
        <Rail title="From the newest sets" href={`/browse?game=${game.key}&sort=newest`} cards={newest} />
      )}

      {sealed.length >= 4 && (
        <Rail title="Sealed products" href={`/browse?game=${game.key}&kind=sealed`} cards={sealed} />
      )}

      {sets.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold text-white">Browse by set</h2>
          <div className="flex flex-wrap gap-2">
            {sets.map((s) => (
              <Link
                key={s.setName}
                href={`/browse?game=${game.key}&set=${encodeURIComponent(s.setName)}`}
                className="chip border border-ink-700 px-3 py-1.5 text-sm text-slate-300 hover:border-brand-500 hover:text-white"
              >
                {s.setName}
              </Link>
            ))}
          </div>
        </section>
      )}

      {totalCards === 0 && (
        <section className="card-surface p-10 text-center">
          <h2 className="text-lg font-bold text-white">{game.name} catalogue import in progress</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            This game&apos;s database is being imported — check back shortly.
          </p>
        </section>
      )}
    </div>
  );
}

function Rail({ title, href, cards }: { title: string; href: string; cards: Parameters<typeof CardTile>[0]["card"][] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl font-extrabold text-white">{title}</h2>
        <Link href={href} className="btn-ghost shrink-0 text-xs">View all →</Link>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {cards.map((c) => (
          <div key={c.id} className="w-36 shrink-0 sm:w-44">
            <CardTile card={c} showGame={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
