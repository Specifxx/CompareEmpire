import Link from "next/link";

// Entry points INTO the price database — flat, low-key tiles (the site is a
// price-comparison database, not a shop). Pure config, no DB queries; each tile
// deep-links into the existing routes. A single small colour dot is the only
// visual marker; the border brightens on hover (interactive, not blinding).
type Tile = { href: string; title: string; sub: string; dot: string };

const TILES: Tile[] = [
  { href: "/browse", title: "Browse all cards", sub: "The full database", dot: "#ff6a6a" },
  { href: "/sets", title: "By set", sub: "Every Pokémon set", dot: "#7dd3fc" },
  { href: "/card-value", title: "Value checker", sub: "What's it worth?", dot: "#ffd23f" },
  { href: "/deals", title: "Deals", sub: "Below market price", dot: "#6ee7b7" },
  { href: "/sealed", title: "Sealed", sub: "Boxes & ETBs", dot: "#c4b5fd" },
  { href: "/market", title: "Market index", sub: "Price trends", dot: "#f9a8d4" },
];

export function CollectionTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {TILES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          prefetch={false}
          className="card-surface group flex items-center gap-3 p-3 outline-none transition-colors hover:border-ink-600 focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: t.dot }}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">{t.title}</span>
            <span className="block truncate text-[11px] text-slate-400">{t.sub}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
