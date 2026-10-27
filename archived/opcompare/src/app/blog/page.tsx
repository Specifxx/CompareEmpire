import type { Metadata } from "next";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";

export const metadata: Metadata = {
  title: "Blog — Buying One Piece Cards Smarter",
  description:
    "Price commentary and buying angles for One Piece Card Game buyers: the cheapest ways to buy, sealed vs singles maths, and how card prices really work.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const articles = getArticles("blog");
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-white">Blog</h1>
        <p className="mt-1 text-sm text-slate-400">
          Buying One Piece Card Game cards smarter — deals, price mechanics and honest
          maths, for people spending real money on cardboard.
        </p>
      </div>
      <ArticleList articles={articles} basePath="/blog" />
    </div>
  );
}
