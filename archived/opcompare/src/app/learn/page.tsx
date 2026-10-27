import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Learn One Piece Card Game Collecting — Beginner's Path | OPCompare",
  description:
    "New to collecting One Piece cards? A guided path through the essentials — rarities, spotting fakes, and buying singles for less.",
  alternates: { canonical: "/learn" },
  openGraph: { title: "Learn One Piece Card Game collecting", url: `${SITE_URL}/learn` },
};

// Built from the guides that actually exist, in a preferred reading order.
// Anything published later and not listed here is appended by date, so the page
// grows with the library. (Deliberately not a hardcoded slug list like the
// DexCompare original: OPCompare's guide library is much smaller, and naming
// slugs that don't exist would render an empty page.)
const PREFERRED_ORDER = [
  "one-piece-card-rarities-explained",
  "cheapest-way-to-buy-one-piece-singles",
  "how-to-spot-fake-one-piece-cards",
];

const WHY: Record<string, string> = {
  "one-piece-card-rarities-explained": "Start here — what makes a card common vs. a chase card.",
  "cheapest-way-to-buy-one-piece-singles": "How to actually pay less for the cards you want.",
  "how-to-spot-fake-one-piece-cards": "The red flags that separate a deal from a scam.",
};

export default function LearnPage() {
  const rank = (slug: string) => {
    const i = PREFERRED_ORDER.indexOf(slug);
    return i === -1 ? PREFERRED_ORDER.length : i;
  };
  const steps = [...getArticles("guide")]
    .sort((a, b) => rank(a.slug) - rank(b.slug) || a.date.localeCompare(b.date))
    .map((a, i) => ({ article: a, n: i + 1 }));

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Learn One Piece Card Game collecting",
    url: `${SITE_URL}/learn`,
    itemListElement: steps.map((s) => ({
      "@type": "ListItem",
      position: s.n,
      name: s.article.title,
      url: `${SITE_URL}/guides/${s.article.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Learn</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Learn One Piece Card Game collecting</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        New to collecting? Work through these in order — from reading a card&apos;s rarity to buying without getting
        burned. {SITE_NAME} adds guides regularly, and new ones appear here automatically.
      </p>

      {steps.length === 0 ? (
        <div className="card-surface mt-8 p-8 text-center text-sm text-slate-400">
          Guides are on the way — <Link href="/blog" className="text-brand-400 hover:underline">read the blog</Link> in the meantime.
        </div>
      ) : (
        <ol className="mt-8 flex flex-col gap-3">
          {steps.map((s) => (
            <li key={s.article.slug}>
              <Link
                href={`/guides/${s.article.slug}`}
                className="card-surface flex items-start gap-4 p-4 transition-colors hover:border-brand-500"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-extrabold text-brand-300">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-white">{s.article.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{WHY[s.article.slug] ?? s.article.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 text-center text-sm text-slate-500">
        Question the guides don&apos;t cover? <Link href="/support" className="text-brand-400 hover:underline">Visit support →</Link>
      </div>
    </div>
  );
}
