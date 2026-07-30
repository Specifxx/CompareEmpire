import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Free One Piece Card Game Tools & Calculators | OPCompare" },
  description:
    "Every free OPCompare tool in one place: selling-fee (net proceeds) calculator, should-I-grade EV calculator, cross-market arbitrage, card value checker, trade calculator, collection tracker and proxy printer.",
  alternates: { canonical: "/tools" },
  keywords: [
    "one piece card tools",
    "one piece tcg calculator",
    "one piece card value calculator",
    "one piece selling fee calculator",
    "should i grade my one piece card",
  ],
  openGraph: {
    title: "Free One Piece Card Game Tools & Calculators",
    description: "Selling-fee, grading-EV, arbitrage, value checker, trade calc and more — all free.",
    url: `${SITE_URL}/tools`,
  },
};

interface Tool {
  href: string;
  icon: string;
  title: string;
  desc: string;
  badge?: string;
}
interface ToolGroup {
  label: string;
  tools: Tool[];
}

const GROUPS: ToolGroup[] = [
  {
    label: "Buying & value",
    tools: [
      {
        href: "/card-value",
        icon: "💰",
        title: "Card value checker",
        desc: "Look up any One Piece card's live market value plus the cheapest real store price across AU, NZ, US & UK.",
      },
      {
        href: "/tools/arbitrage",
        icon: "💱",
        title: "Arbitrage — flip to TCGplayer",
        desc: "Cards priced well below TCGplayer's market price — buy cheap, flip for a profit after fees.",
      },
      {
        href: "/deals",
        icon: "🔥",
        title: "Today's deals",
        desc: "Cards priced well below their market guide right now, refreshed daily.",
      },
      {
        href: "/bulk-pricer",
        icon: "📋",
        title: "Bulk pricer",
        desc: "Paste or upload hundreds of card names and get every price at once — built for bulk lots.",
        badge: "New",
      },
    ],
  },
  {
    label: "Selling & grading",
    tools: [
      {
        href: "/tools/net-proceeds",
        icon: "💵",
        title: "Net-proceeds calculator",
        desc: "Enter a sale price and see what you actually pocket after eBay / TCGplayer fees, postage and optional grading.",
        badge: "New",
      },
      {
        href: "/tools/grade-ev",
        icon: "🎯",
        title: "Should I grade it?",
        desc: "Weigh a raw card's value against PSA 10/9 odds and grading cost to see if submitting it pays off.",
        badge: "New",
      },
    ],
  },
  {
    label: "Your collection",
    tools: [
      {
        href: "/collection",
        icon: "📚",
        title: "Collection tracker",
        desc: "Track the cards you own and watch their live value move over time.",
      },
      {
        href: "/wishlist",
        icon: "❤️",
        title: "Wishlist",
        desc: "Save cards you want and get price context so you buy at the right time.",
      },
      {
        href: "/trade",
        icon: "⚖️",
        title: "Trade calculator",
        desc: "Value both sides of a card trade fairly before you commit.",
      },
      {
        href: "/tools/best-basket",
        icon: "🧺",
        title: "Best basket",
        desc: "Price your whole wishlist at once — cheapest single store vs splitting across stores.",
        badge: "New",
      },
    ],
  },
  {
    label: "Printing",
    tools: [
      {
        href: "/proxy",
        icon: "🖨️",
        title: "Proxy printer",
        desc: "Generate print-ready proxy sheets for playtesting before you buy the real cards.",
      },
    ],
  },
];

export default function ToolsHubPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "OPCompare Tools & Calculators",
    url: `${SITE_URL}/tools`,
    itemListElement: GROUPS.flatMap((g) => g.tools).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${SITE_URL}${t.href}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Tools</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Tools &amp; calculators</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Every OPCompare tool in one place — all free, no sign-up. Price-check a card, see what you&apos;d
        actually pocket after fees, work out whether grading pays, track your collection and more.
      </p>

      {GROUPS.map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.tools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="card-surface group flex gap-3 p-4 transition-colors hover:border-ink-600"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800 text-xl" aria-hidden>
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white group-hover:text-brand-300">{t.title}</h3>
                    {t.badge && (
                      <span className="chip bg-brand-500/15 text-[10px] font-semibold text-brand-300">{t.badge}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
