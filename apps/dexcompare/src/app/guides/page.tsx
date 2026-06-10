import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";

export const metadata: Metadata = {
  title: "Pokémon Card Collecting Guides — Buying, Grading, Storage & Fakes",
  description:
    "Collector-focused Pokémon TCG guides: where to buy cards cheapest, card conditions and grading, spotting fakes, storage and protection, and rarities explained.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const articles = getArticles("guide");
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Collecting Guides</h1>
        <p className="mt-1 text-sm text-slate-400">
          How to collect Pokémon cards well — buying at the right price, conditions and
          grading, avoiding fakes, and keeping your collection mint.
        </p>
      </div>
      <ArticleList articles={articles} basePath="/guides" />
    </div>
  );
}
