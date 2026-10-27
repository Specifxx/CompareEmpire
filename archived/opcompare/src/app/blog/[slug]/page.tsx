import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/articles";
import { ArticleView } from "@/components/ArticleView";

export function generateStaticParams() {
  return getArticles("blog").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = getArticle(params.slug);
  if (!a || a.category !== "blog") notFound(); // real 404 — metadata resolves before streaming
  return {
    title: `${a.title} — OPCompare Blog`,
    description: a.excerpt,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.excerpt },
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a || a.category !== "blog") notFound();
  return <ArticleView article={a} />;
}
