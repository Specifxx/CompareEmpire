import Link from "next/link";
import { GAMES, type GameKey } from "@/lib/games";
import { formatMoney } from "@/lib/format";
import type { CardTileData } from "@/lib/cards";

// A product tile (card or sealed) for grids and rails. Server component — image
// hosts vary per source (Scryfall, YGOPRODeck, TCGplayer CDN), so a lazy <img>
// is used rather than next/image (which would need every host allow-listed).
export function CardTile({ card, showGame = true }: { card: CardTileData; showGame?: boolean }) {
  const game = GAMES[card.game as GameKey];
  return (
    <Link
      href={`/card/${card.slug}`}
      prefetch={false}
      className="cv-auto group card-surface relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div
        className="relative grid aspect-[5/7] w-full place-items-center overflow-hidden p-3"
        style={{ background: `radial-gradient(120% 80% at 50% 0%, ${game?.color ?? "#8b5cf6"}1f, transparent 60%)` }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            loading="lazy"
            className="max-h-full max-w-full rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="px-2 text-center text-xs font-bold text-slate-600">{card.name}</span>
        )}
        {showGame && game && (
          <span
            className="chip absolute left-2 top-2 bg-ink-950/70 text-[10px] font-semibold"
            style={{ color: game.color }}
          >
            {game.icon} {game.short}
          </span>
        )}
        {card.kind === "sealed" && (
          <span className="chip absolute right-2 top-2 bg-gold/15 text-[10px] font-semibold text-gold">Sealed</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-ink-700 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white" title={card.name}>
          {card.name}
        </h3>
        <p className="line-clamp-1 text-xs text-slate-500">
          {card.setName}
          {card.collectorNumber ? ` · ${card.collectorNumber}` : ""}
        </p>

        <div className="mt-auto flex items-end justify-between pt-1">
          {card.marketPriceCents != null ? (
            <div>
              <div className="text-[11px] text-slate-500">market</div>
              <div className="text-lg font-bold text-accent">{formatMoney(card.marketPriceCents, "USD")}</div>
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-500">Compare →</div>
          )}
          {card.rarity && <div className="text-right text-[11px] font-semibold text-brand-400">{card.rarity}</div>}
        </div>
      </div>
    </Link>
  );
}
