import Link from "next/link";
import { POKEMON_SETS } from "@/lib/pokemon-sets";

// Shopify-storefront "shop by collection" tiles. Pure config (no DB queries) —
// each tile deep-links into the existing browse/deals/sealed/sets routes where the
// real data lives, so this is zero-risk and egress-free.
type Tile = {
  href: string;
  emoji: string;
  title: string;
  sub: string;
  // Tailwind gradient classes for the tile's accent wash.
  wash: string;
  logo?: string | null;
};

export function CollectionTiles() {
  const newest = POKEMON_SETS[0];
  const tiles: Tile[] = [
    { href: "/deals", emoji: "🔥", title: "Today's deals", sub: "Below market guide", wash: "from-emerald-500/15 to-transparent" },
    { href: "/browse?priced=1&sort=price_desc", emoji: "💎", title: "Most valuable", sub: "Chase grails", wash: "from-gold/15 to-transparent" },
    { href: "/browse?priced=1&sort=price_asc", emoji: "💸", title: "Cheapest cards", sub: "Lowest live prices", wash: "from-brand-500/15 to-transparent" },
    { href: "/sealed", emoji: "📦", title: "Sealed products", sub: "Boxes, ETBs & bundles", wash: "from-sky-500/15 to-transparent" },
    ...(newest
      ? [{ href: `/sets/${newest.slug}`, emoji: "🆕", title: newest.name, sub: "Newest set", wash: "from-fuchsia-500/15 to-transparent", logo: newest.logo } as Tile]
      : []),
    { href: "/sets", emoji: "🗂️", title: "All sets", sub: "Shop by set", wash: "from-indigo-500/15 to-transparent" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          prefetch={false}
          className={`card-surface lift shine group relative flex flex-col gap-1 overflow-hidden bg-gradient-to-br ${t.wash} p-4`}
        >
          <div className="flex h-8 items-center">
            {t.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo} alt="" className="max-h-8 max-w-[70%] object-contain transition-transform group-hover:scale-105" loading="lazy" />
            ) : (
              <span className="text-2xl" aria-hidden>{t.emoji}</span>
            )}
          </div>
          <div className="mt-1 line-clamp-1 text-sm font-bold text-white">{t.title}</div>
          <div className="text-[11px] text-slate-400">{t.sub}</div>
        </Link>
      ))}
    </div>
  );
}
