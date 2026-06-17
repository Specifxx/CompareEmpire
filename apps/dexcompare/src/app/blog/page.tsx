import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { ArticleList } from "@/components/ArticleList";

export const metadata: Metadata = {
  title: "Blog — Buying Pokémon Cards Smarter",
  description:
    "Price commentary and buying angles for Pokémon card buyers: the cheapest ways to buy, sealed vs singles maths, and how card prices really work.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 86400;

export default function BlogPage() {
  const articles = getArticles("blog");
  return (
    <div>
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
        className="card-surface mb-6 flex flex-wrap items-center justify-between gap-3 border-brand-500/30 bg-gradient-to-r from-brand-600/15 to-transparent p-4 transition-colors hover:border-brand-500"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-bold text-white">
            <span aria-hidden>📈</span> Daily Market Wrap
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
