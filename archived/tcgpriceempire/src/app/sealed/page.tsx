import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CardTile } from "@/components/CardTile";
import { AdSlot } from "@/components/AdSlot";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { cardTileSelect } from "@/lib/cards";
import { getSelectedGames } from "@/lib/get-games";
import { GAMES, GAME_LIST } from "@/lib/games";

// Sealed across every game the visitor plays — booster boxes, ETBs, collection
// boxes, with live market prices. The full filterable view lives on /browse.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sealed product prices — booster boxes & ETBs across every TCG",
  description:
    "Compare sealed product prices across Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Riftbound — booster boxes, elite trainer boxes, collection boxes and more.",
  alternates: { canonical: "/sealed" },
};

export default async function SealedPage() {
  const selected = getSelectedGames();

  const rails = await Promise.all(
    selected.map(async (key) => ({
      game: GAMES[key],
      items: await prisma.card.findMany({
        where: { game: key, kind: "sealed", marketPriceCents: { not: null } },
        orderBy: { marketPriceCents: "desc" },
        take: 12,
        select: cardTileSelect,
      }),
    }))
  );
  const withData = rails.filter((r) => r.items.length >= 2);

  return (
    <div className="flex flex-col gap-10">
      <section className="card-surface overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Sealed products, every game</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Booster boxes, elite trainer boxes, collection boxes and bundles across all five TCGs — live
            market prices so you know what a fair deal looks like before you buy (or resell).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GAME_LIST.map((g) => (
              <Link
                key={g.key}
                href={`/browse?game=${g.key}&kind=sealed`}
                className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500"
                style={{ color: g.color }}
              >
                {g.icon} {g.short} sealed
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AdSlot slot={ADSENSE_SLOTS.browse} format="horizontal" height={90} />

      {withData.map((r) => (
        <section key={r.game.key}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-xl font-extrabold text-white">
              {r.game.icon} {r.game.short} sealed
            </h2>
            <Link href={`/browse?game=${r.game.key}&kind=sealed`} className="btn-ghost shrink-0 text-xs">
              View all →
            </Link>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {r.items.map((c) => (
              <div key={c.id} className="w-40 shrink-0 sm:w-44">
                <CardTile card={c} showGame={false} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {withData.length === 0 && (
        <section className="card-surface p-10 text-center">
          <h2 className="text-lg font-bold text-white">Sealed catalogue import in progress</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Sealed products are imported with each game&apos;s catalogue — check back shortly.
          </p>
        </section>
      )}
    </div>
  );
}
