import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";

export const metadata: Metadata = {
  title: "One Piece Card Buying Guides — Where to Buy, Grading, Storage & Fakes",
  description:
    "Buyer-focused One Piece Card Game guides: where to buy cards cheapest, card conditions and grading, spotting fakes, storage and protection, and rarities explained.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const articles = getArticles("guide");
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Buying Guides</h1>
        <p className="mt-1 text-sm text-slate-400">
          How to buy One Piece cards well — the right price, the right condition,
          no fakes, and a collection that stays mint.
        </p>
      </div>
      <ArticleList articles={articles} basePath="/guides" />
    </div>
  );
}
