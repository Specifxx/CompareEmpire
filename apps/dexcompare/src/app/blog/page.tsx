import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog — Buying Pokémon Cards Smarter",
  description:
    "Price commentary and buying angles for Pokémon card buyers: the cheapest ways to buy, sealed vs singles maths, and how card prices really work.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 86400;

export default function BlogPage() {
  const articles = getArticles("blog");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "DexCompare Blog",
      url: `${SITE_URL}/blog`,
      description: "Price commentary and buying angles for Pokémon card buyers: the cheapest ways to buy, sealed vs singles maths, and how card prices really work.",
      isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/blog/${a.slug}`,
          name: a.title,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      ],
    },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Blog</h1>
        <p className="mt-1 text-sm text-slate-400">
          Buying Pokémon cards smarter — deals, price mechanics and honest maths,
          for people spending real money on cardboard.
        </p>
      </div>
      {/* Automated daily market report — fresh content every day. */}
      <Link
        href="/blog/market-wrap"
        className="card-surface mb-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-brand-500 p-4 transition-colors hover:border-ink-600"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-bold text-white">
            Daily Market Wrap
            <span className="chip bg-brand-500/15 text-[10px] font-bold uppercase tracking-wide text-brand-300">New every day</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            How the Pokémon singles market moved today — the Global Index, every market&apos;s session, and the
            cards that drove it. Generated from real store-price snapshots.
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-brand-400">Read today&apos;s →</span>
      </Link>

      <ArticleList articles={articles} basePath="/blog" />
    </div>
  );
}
