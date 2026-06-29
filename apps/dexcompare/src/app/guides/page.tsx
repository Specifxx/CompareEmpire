import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";
import type { Article } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Pokémon Card Guides — Buying, Selling, Grading & Storage",
  description:
    "Pokémon TCG guides for collectors: where to buy cards cheapest, how to sell your collection, card conditions and grading, spotting fakes, storage and protection, and rarities explained.",
  alternates: { canonical: "/guides" },
};

// Topic sections — controls grouping and display order.
// Any guide slug not listed here appears in "More guides" at the end.
const TOPICS: { id: string; label: string; slugs: string[] }[] = [
  {
    id: "getting-started",
    label: "Getting started",
    slugs: [
      "where-to-buy-pokemon-cards",
      "how-to-start-collecting-pokemon-cards",
    ],
  },
  {
    id: "value-and-grading",
    label: "Value & grading",
    slugs: [
      "pokemon-card-rarities-explained",
      "pokemon-card-conditions-and-grading",
      "how-to-value-your-pokemon-card-collection",
      "pokemon-card-grading-psa-vs-cgc",
    ],
  },
  {
    id: "buying-strategy",
    label: "Buying strategy",
    slugs: [
      "how-to-complete-a-pokemon-tcg-set",
      "pokemon-sealed-products-explained",
    ],
  },
  {
    id: "care-and-safety",
    label: "Care & safety",
    slugs: [
      "how-to-store-and-protect-pokemon-cards",
      "how-to-spot-fake-pokemon-cards",
    ],
  },
  {
    id: "selling",
    label: "Selling your cards",
    slugs: [
      "how-to-sell-pokemon-cards",
    ],
  },
];

export default function GuidesPage() {
  const all = getArticles("guide");
  const bySlug = new Map<string, Article>(all.map((a) => [a.slug, a]));
  const assigned = new Set(TOPICS.flatMap((t) => t.slugs));
  const overflow = all.filter((a) => !assigned.has(a.slug));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Buying Guides</h1>
        <p className="mt-1 text-sm text-slate-400">
          How to buy, value and sell Pokémon cards well — the right price, the
          right condition, no fakes, and a collection that stays mint.
        </p>
      </div>

      {/* Jump-nav — one pill per topic for quick in-page navigation */}
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Guide topics">
        {TOPICS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-brand-500 hover:text-white"
          >
            {t.label}
          </a>
        ))}
      </nav>

      {/* Topic sections */}
      <div className="flex flex-col gap-10">
        {TOPICS.map((topic) => {
          const articles = topic.slugs
            .map((s) => bySlug.get(s))
            .filter((a): a is Article => a !== undefined);
          if (articles.length === 0) return null;
          return (
            <section key={topic.id} id={topic.id} aria-labelledby={`topic-${topic.id}`}>
              <div className="mb-4 flex items-baseline gap-3 border-b border-ink-700 pb-2">
                <h2
                  id={`topic-${topic.id}`}
                  className="text-base font-extrabold uppercase tracking-wide text-slate-200"
                >
                  {topic.label}
                </h2>
                <span className="text-xs text-slate-500">
                  {articles.length} {articles.length === 1 ? "guide" : "guides"}
                </span>
              </div>
              <ArticleList articles={articles} basePath="/guides" />
            </section>
          );
        })}

        {/* Catch-all: any guides added in future without a topic assignment */}
        {overflow.length > 0 && (
          <section id="more-guides" aria-labelledby="topic-more">
            <div className="mb-4 flex items-baseline gap-3 border-b border-ink-700 pb-2">
              <h2
                id="topic-more"
                className="text-base font-extrabold uppercase tracking-wide text-slate-200"
              >
                More guides
              </h2>
              <span className="text-xs text-slate-500">
                {overflow.length} {overflow.length === 1 ? "guide" : "guides"}
              </span>
            </div>
            <ArticleList articles={overflow} basePath="/guides" />
          </section>
        )}
      </div>
    </div>
  );
}
