import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Explore Every ${SITE_NAME} Feature`,
  description: `A complete map of everything ${SITE_NAME} does — price comparison, hubs, tools, alerts and community, all free.`,
  alternates: { canonical: "/explore-features" },
  openGraph: { title: `Explore every ${SITE_NAME} feature`, url: `${SITE_URL}/explore-features` },
};

interface Feature { href: string; icon: string; title: string; desc: string }
interface Group { label: string; features: Feature[] }

const GROUPS: Group[] = [
  {
    label: "Price comparison",
    features: [
      { href: "/browse", icon: "🃏", title: "Card database", desc: "Search and filter every tracked One Piece card with live prices." },
      { href: "/sets", icon: "🗂️", title: "Browse by set", desc: "Every set, from Base to the newest release." },
      { href: "/sealed", icon: "📦", title: "Sealed products", desc: "Booster boxes, ETBs, tins and more, compared live." },
      { href: "/card-value", icon: "💰", title: "Card value checker", desc: "Look up any card's live value plus the cheapest real price." },
      { href: "/deals", icon: "🔥", title: "Today's deals", desc: "Cards priced well below their market guide, refreshed daily." },
    ],
  },
  {
    label: "Discover cards",
    features: [
      { href: "/cards", icon: "🧭", title: "Browse by type, rarity & era", desc: "Faceted hubs into the whole catalogue." },
      { href: "/one piece/charizard", icon: "🔥", title: "Character price guides", desc: "Every printing of a character, one price guide — e.g. Luffy." },
    ],
  },
  {
    label: "Market data",
    features: [
      { href: "/tools/arbitrage", icon: "💱", title: "Arbitrage — flip to TCGplayer", desc: "Cards priced well below TCGplayer's market price." },
      { href: "/restock", icon: "📅", title: "Drops & restocks", desc: "Track sold-out products and get alerted when they're back." },
    ],
  },
  {
    label: "Tools & calculators",
    features: [
      { href: "/tools", icon: "🧰", title: "All tools", desc: "Every calculator in one place." },
      { href: "/bulk-pricer", icon: "📋", title: "Bulk pricer", desc: "Price hundreds of cards at once from a pasted list." },
      { href: "/tools/best-basket", icon: "🧺", title: "Best basket", desc: "Price your whole wishlist — one store vs. splitting across stores." },
      { href: "/tools/net-proceeds", icon: "💵", title: "Net-proceeds calculator", desc: "What you'd actually pocket after fees." },
      { href: "/tools/grade-ev", icon: "🎯", title: "Should I grade it?", desc: "Weigh raw value against grading odds and cost." },
      { href: "/trade", icon: "⚖️", title: "Trade calculator", desc: "Value both sides of a trade fairly." },
      { href: "/proxy", icon: "🖨️", title: "Proxy printer", desc: "Print-ready proxy sheets for playtesting." },
    ],
  },
  {
    label: "Track & get alerted",
    features: [
      { href: "/wishlist", icon: "❤️", title: "Wishlist + price-drop alerts", desc: "Email me the moment a saved card gets cheaper." },
      { href: "/collection", icon: "📚", title: "Collection tracker", desc: "Track what you own and its live value." },
      { href: "/restock", icon: "🔔", title: "Restock alerts", desc: "No-account email alerts for sold-out products." },
      { href: "/widgets", icon: "🔗", title: "Embeddable price widgets", desc: "A free live price badge for your own site." },
    ],
  },
  {
    label: "Learn & community",
    features: [
      { href: "/learn", icon: "🎓", title: "Learn One Piece Card Game collecting", desc: "A structured beginner's path through the essentials." },
      { href: "/guides", icon: "📖", title: "Buying guides", desc: "In-depth guides on every collecting topic." },
      { href: "/stores", icon: "🏪", title: "Stores we track", desc: "Every retailer, with its own profile page." },
      { href: "/blog", icon: "✍️", title: "Blog", desc: "News and market commentary." },
      { href: "/support", icon: "🛟", title: "Support & help center", desc: "Answers, or get in touch." },
    ],
  },
];

export default function ExploreFeaturesPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Every ${SITE_NAME} feature`,
    url: `${SITE_URL}/explore-features`,
    itemListElement: GROUPS.flatMap((g) => g.features).map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.title, url: `${SITE_URL}${f.href}` })),
  };

  return (
    <div className="mx-auto max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Explore features</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Explore every {SITE_NAME} feature</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Everything {SITE_NAME} does, all free, no sign-up required.
      </p>

      {GROUPS.map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.features.map((f) => (
              <Link key={f.href} href={f.href} className="card-surface group flex gap-3 p-4 transition-colors hover:border-ink-600">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800 text-xl" aria-hidden>{f.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-white group-hover:text-brand-300">{f.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
