import Link from "next/link";
import type { Article } from "@/lib/articles";
import { getRelatedArticles } from "@/lib/articles";
import { Markdown } from "./Markdown";
import { fmtDate } from "./ArticleList";
import { AdSlot } from "./AdSlot";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function ArticleView({ article }: { article: Article }) {
  const isGuide = article.category === "guide";
  const backHref = isGuide ? "/guides" : "/blog";
  const backLabel = isGuide ? "Guides" : "Blog";
  const related = getRelatedArticles(article.slug, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isGuide ? "TechArticle" : "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    author: { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: article.author },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}${backHref}/${article.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: backLabel, item: `${SITE_URL}${backHref}` },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-1.5 text-sm">
        <Link href="/" className="shrink-0 text-slate-500 transition-colors hover:text-slate-300">Home</Link>
        <span className="shrink-0 text-slate-600" aria-hidden>›</span>
        <Link href={backHref} className="shrink-0 text-slate-500 transition-colors hover:text-slate-300">{backLabel}</Link>
        <span className="shrink-0 text-slate-600" aria-hidden>›</span>
        <span className="truncate text-slate-400" aria-current="page">{article.title}</span>
      </nav>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {article.tags.map((t) => (
          <span key={t} className="chip bg-ink-800 text-slate-400">{t}</span>
        ))}
      </div>

      <h1 className="text-3xl font-extrabold leading-tight text-white">{article.title}</h1>
      <div className="mt-2 text-sm text-slate-500">
        {article.author} · {fmtDate(article.date)} · {article.readMins} min read
      </div>

      <AdSlot className="mt-6" height={120} />

      <div className="mt-6 border-t border-ink-800 pt-4">
        <Markdown content={article.body} />
      </div>

      <AdSlot className="mt-8" height={120} />

      {related.length > 0 && (
        <section className="mt-10 border-t border-ink-800 pt-8">
          <h2 className="mb-4 text-lg font-extrabold text-white">
            More {isGuide ? "guides" : "posts"} you might like
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((a) => (
              <Link
                key={a.slug}
                href={`${backHref}/${a.slug}`}
                className="card-surface flex flex-col p-4 transition-colors hover:border-ink-600"
              >
                <div className="flex flex-wrap gap-1 mb-2">
                  {a.tags.slice(0, 2).map((t) => (
                    <span key={t} className="chip bg-ink-800 text-slate-500 text-[10px]">{t}</span>
                  ))}
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-2 flex-1">{a.title}</h3>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{a.excerpt}</p>
                <div className="mt-3 text-xs text-slate-500">{fmtDate(a.date)} · {a.readMins} min read</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
