import Link from "next/link";

// Entry points INTO the price database — dark, low-key tiles (the site is a
// price-comparison database, not a shop). Pure config, no DB queries; each tile
// deep-links into the existing routes. Colour is restrained to a small icon
// accent; the lift/glow only appears on hover (interactive, not blinding).
type Tile = { href: string; emoji: string; title: string; sub: string; dot: string };

const TILES: Tile[] = [
  { href: "/browse", emoji: "🃏", title: "Browse all cards", sub: "The full database", dot: "#ff6a6a" },
  { href: "/sets", emoji: "🗂️", title: "By set", sub: "Every Pokémon set", dot: "#7dd3fc" },
  { href: "/card-value", emoji: "💰", title: "Value checker", sub: "What's it worth?", dot: "#ffd23f" },
  { href: "/deals", emoji: "🔥", title: "Deals", sub: "Below market price", dot: "#6ee7b7" },
  { href: "/sealed", emoji: "📦", title: "Sealed", sub: "Boxes & ETBs", dot: "#c4b5fd" },
  { href: "/market", emoji: "📈", title: "Market index", sub: "Price trends", dot: "#f9a8d4" },
];

export function CollectionTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {TILES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          prefetch={false}
          className="card-surface lift group flex items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-900 text-base transition-colors group-hover:border-ink-600"
            style={{ boxShadow: `inset 0 0 14px -8px ${t.dot}` }}
            aria-hidden
          >
            {t.emoji}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">{t.title}</span>
            <span className="block truncate text-[11px] text-slate-400">{t.sub}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
