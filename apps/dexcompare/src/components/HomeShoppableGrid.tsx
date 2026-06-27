import Link from "next/link";
import { CardTile, type CardTileData } from "./CardTile";

// A preview of the price database: a static slice of CardTiles from the cached
// home-data memo (no extra Neon egress), with one clear "browse everything" CTA.
// Sorting/filtering lives on /browse (force-dynamic) — kept off the homepage to
// preserve ISR and keep things minimal.
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
  return (
    <section aria-labelledby="db-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="db-heading" className="flex items-center gap-2 text-xl font-extrabold text-white sm:text-2xl">
            <span className="h-5 w-1 rounded-full bg-brand-500" aria-hidden />
            Browse the card database
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="font-semibold text-white">{totalCards.toLocaleString()}</span> cards · compared across{" "}
            <span className="font-semibold text-white">{storeCount}</span> {adjective} stores
          </p>
        </div>
        <Link href="/browse" prefetch={false} className="btn-ghost shrink-0 text-xs">Browse &amp; filter →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Link href="/browse" className="btn-primary">Browse all {totalCards.toLocaleString()} cards →</Link>
      </div>
    </section>
  );
}
