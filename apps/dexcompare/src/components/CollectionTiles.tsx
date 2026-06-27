import Link from "next/link";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

// Shopify-storefront "shop by collection" tiles — solid, vibrant, glowing (no
// transparency). Pure config (no DB queries); each tile deep-links into the
// existing browse/deals/sealed/sets routes.
type Tile = {
  href: string;
  emoji: string;
  title: string;
  sub: string;
  grad: string; // solid gradient background
  text: string; // foreground colour
  glow: string; // box-shadow glow (inline)
};

export function CollectionTiles() {
  const newest = POKEMON_SETS[0];
  const tiles: Tile[] = [
    { href: "/deals", emoji: "🔥", title: "Today's deals", sub: "Below market guide", grad: "from-emerald-600 to-emerald-500", text: "text-white", glow: "0 8px 30px rgba(16,185,129,0.45)" },
    { href: "/browse?priced=1&sort=price_desc", emoji: "💎", title: "Most valuable", sub: "Chase grails", grad: "from-amber-400 to-yellow-500", text: "text-ink-950", glow: "0 8px 30px rgba(255,203,5,0.45)" },
    { href: "/browse?priced=1&sort=price_asc", emoji: "💸", title: "Cheapest cards", sub: "Lowest live prices", grad: "from-brand-500 to-brand-600", text: "text-white", glow: "0 8px 30px rgba(238,21,21,0.45)" },
    { href: "/sealed", emoji: "📦", title: "Sealed products", sub: "Boxes, ETBs & bundles", grad: "from-sky-600 to-sky-500", text: "text-white", glow: "0 8px 30px rgba(56,189,248,0.45)" },
    ...(newest
      ? [{ href: `/sets/${newest.slug}`, emoji: "🆕", title: newest.name, sub: "Newest set", grad: "from-fuchsia-600 to-fuchsia-500", text: "text-white", glow: "0 8px 30px rgba(232,121,249,0.45)" } as Tile]
      : []),
    { href: "/sets", emoji: "🗂️", title: "All sets", sub: "Shop by set", grad: "from-indigo-600 to-indigo-500", text: "text-white", glow: "0 8px 30px rgba(99,102,241,0.45)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          prefetch={false}
          style={{ boxShadow: t.glow }}
          className={`shine group relative flex flex-col gap-1 overflow-hidden rounded-xl bg-gradient-to-br ${t.grad} ${t.text} p-4 outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-white/70`}
        >
          <span className="text-2xl drop-shadow" aria-hidden>{t.emoji}</span>
          <div className="mt-1 line-clamp-1 text-sm font-extrabold">{t.title}</div>
          <div className="text-[11px] font-medium opacity-90">{t.sub}</div>
        </Link>
      ))}
    </div>
  );
}
