import Link from "next/link";
import type { Article } from "@/lib/articles";
import { Markdown } from "./Markdown";
import { fmtDate } from "./ArticleList";
import { SITE_URL } from "@/lib/site";

export function ArticleView({ article }: { article: Article }) {
  const isGuide = article.category === "guide";
  const backHref = isGuide ? "/guides" : "/blog";
  const backLabel = isGuide ? "All guides" : "All posts";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isGuide ? "TechArticle" : "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: "CameraCompare" },
    mainEntityOfPage: `${SITE_URL}/${article.category === "guide" ? "guides" : "blog"}/${article.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        ← {backLabel}
      </Link>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {article.tags.map((t) => (
          <span key={t} className="chip bg-slate-50 text-slate-600">{t}</span>
        ))}
      </div>

      <h1 className="text-3xl font-extrabold leading-tight text-slate-900">{article.title}</h1>
      <div className="mt-2 text-sm text-slate-500">
        {article.author} · {fmtDate(article.date)} · {article.readMins} min read
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <Markdown content={article.body} />
      </div>
    </article>
  );
}
