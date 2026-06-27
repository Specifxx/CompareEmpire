import Link from "next/link";
import { CardTile, type CardTileData } from "./CardTile";

// The grid-first marketplace centerpiece (CSFloat/Skinport feel): a price-forward
// CardTile grid with a sticky, NON-STATE sort/filter bar. The sort tabs and the
// "All filters" control are plain <Link>s into /browse (where the real,
// force-dynamic faceting lives) — so the homepage stays ISR-cached and adds no
// Neon egress. The grid itself is a static slice from the cached home-data memo.
export function HomeShoppableGrid({
  cards,
  totalCards,
  storeCount,
  adjective,
}: {
  cards: CardTileData[];
  totalCards: number;
  storeCount: number;
  adjective: string;
}) {
  const tabBase =
    "rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-400";
  return (
    <section aria-labelledby="shop-heading">
      {/* Sticky sort/filter bar — sits just under the sticky navbar (h-16). */}
      <div className="sticky top-16 z-30 -mx-1 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-950/90 px-1 py-3 backdrop-blur">
        <div className="min-w-0">
          <h2 id="shop-heading" className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
            <span className="h-5 w-1 rounded-full bg-brand-500" aria-hidden />
            Browse the card database
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="font-semibold text-white">{totalCards.toLocaleString()}</span> cards ·
            compared across <span className="font-semibold text-white">{storeCount}</span> {adjective} stores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Sort">
          <span className={`${tabBase} bg-brand-500/20 text-brand-200`} role="tab" aria-selected="true">
            ⭐ Featured
          </span>
          <Link href="/browse?priced=1&sort=price_asc" prefetch={false} className={`${tabBase} text-slate-300 hover:bg-ink-800 hover:text-white`}>
            💸 Cheapest
          </Link>
          <Link href="/browse?priced=1&sort=price_desc" prefetch={false} className={`${tabBase} text-slate-300 hover:bg-ink-800 hover:text-white`}>
            💎 Most valuable
          </Link>
          <Link href="/browse" prefetch={false} className="btn-ghost text-sm">
            ⚙ All filters
          </Link>
        </div>
      </div>

      {/* The product grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Link href="/browse" className="btn-primary">
          Browse all {totalCards.toLocaleString()} cards →
        </Link>
      </div>
    </section>
  );
}
