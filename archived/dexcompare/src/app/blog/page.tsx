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

      <ArticleList articles={articles} basePath="/blog" />
    </div>
  );
}
