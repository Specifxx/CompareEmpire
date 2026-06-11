import Link from "next/link";
import { prisma } from "@/lib/db";
import { cardTileSelect, type CardTileData } from "@/lib/cards";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { formatMoney } from "@/lib/format";

// Stock-market style price ticker: the top chase cards of EVERY game,
// interleaved round-robin so no single game dominates, scrolling in an
// infinite CSS marquee (content duplicated once; -50% translate loops
// seamlessly). Pauses on hover so items stay clickable.
export async function Ticker() {
  const perGame = await Promise.all(
    GAME_KEYS.map((game) =>
      prisma.card
        .findMany({
          where: { game, kind: "single", marketPriceCents: { not: null } },
          orderBy: { marketPriceCents: "desc" },
          take: 6,
          select: cardTileSelect,
        })
        .catch(() => [] as CardTileData[])
    )
  );

  // Round-robin interleave: P,M,Y,O,R, P,M,Y,O,R, …
  const items: CardTileData[] = [];
  for (let i = 0; i < 6; i++) for (const list of perGame) if (list[i]) items.push(list[i]);
  if (items.length < 8) return null; // not enough data for a convincing ticker

  const strip = (keyPrefix: string) => (
    <div className="flex shrink-0 items-center">
      {items.map((c) => {
        const g = GAMES[c.game as GameKey];
        return (
          <Link
            key={`${keyPrefix}-${c.id}`}
            href={`/card/${c.slug}`}
            prefetch={false}
            className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm hover:bg-ink-800/60"
          >
            <span aria-hidden>{g?.icon}</span>
            <span className="max-w-[180px] truncate font-semibold text-white">{c.name}</span>
            <span className="font-bold text-accent">{formatMoney(c.marketPriceCents as number, "USD")}</span>
            <span className="text-ink-600">·</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-900/60" aria-label="Top card prices ticker">
      {/* Edge fades so items appear to slide in/out of the frame. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="ticker-track flex w-max animate-marquee">
        {strip("a")}
        {strip("b")}
      </div>
    </div>
  );
}
