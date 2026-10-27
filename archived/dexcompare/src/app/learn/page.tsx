import type { Metadata } from "next";
import Link from "next/link";
import { getArticle } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Learn Pokémon TCG Collecting — Beginner's Path | DexCompare",
  description: "New to collecting Pokémon cards? A structured path through the essentials — rarities, conditions, where to buy, and how to avoid getting ripped off.",
  alternates: { canonical: "/learn" },
  openGraph: { title: "Learn Pokémon TCG Collecting", url: `${SITE_URL}/learn` },
};

// Hand-picked, ordered sequence — not every guide, just the beginner path
// through the ones that matter most, in the order a new collector needs them.
const PATH: { slug: string; why: string }[] = [
  { slug: "how-to-start-collecting-pokemon-cards", why: "Start here — the basics of building a collection." },
  { slug: "pokemon-card-rarities-explained", why: "Understand what makes a card common vs. a chase card." },
  { slug: "pokemon-card-set-symbols-and-collector-numbers-explained", why: "Read any card's set and number at a glance." },
  { slug: "pokemon-card-sets-and-eras-explained", why: "Get your bearings across 25+ years of Pokémon TCG sets." },
  { slug: "pokemon-card-conditions-and-grading", why: "Know NM from LP before you buy — condition drives price." },
  { slug: "where-to-buy-pokemon-cards", why: "Where collectors actually buy, in AU, US and UK." },
  { slug: "why-pokemon-card-prices-differ-between-stores", why: "Why the same card can be five different prices." },
  { slug: "cheapest-way-to-buy-pokemon-cards", why: "Put it together: how to actually pay less." },
  { slug: "how-to-avoid-pokemon-card-buying-scams", why: "The red flags that separate a deal from a scam." },
  { slug: "how-to-store-and-protect-pokemon-cards", why: "Protect what you've bought." },
  { slug: "pokemon-tcg-glossary", why: "Bookmark this — every term explained in one place." },
];

export default function LearnPage() {
  const steps = PATH.map((p, i) => ({ ...p, article: getArticle(p.slug), n: i + 1 })).filter((s) => s.article);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Learn Pokémon TCG collecting",
    url: `${SITE_URL}/learn`,
    itemListElement: steps.map((s) => ({ "@type": "ListItem", position: s.n, name: s.article!.title, url: `${SITE_URL}/guides/${s.slug}` })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Learn</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Learn Pokémon TCG collecting</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        New to collecting? Work through these {steps.length} guides in order — from your first card to knowing a
        real deal from a scam. Already know the basics? Jump straight to whichever one you need from{" "}
        <Link href="/guides" className="text-brand-400 hover:underline">the full guides library</Link>.
      </p>

      <ol className="mt-8 flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.slug}>
            <Link href={`/guides/${s.slug}`} className="card-surface flex items-start gap-4 p-4 transition-colors hover:border-brand-500">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/15 text-sm font-extrabold text-brand-300">{s.n}</span>
              <div className="min-w-0">
                <h2 className="font-bold text-white">{s.article!.title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{s.why}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-8 text-center text-sm text-slate-500">
        Have a question the guides don&apos;t cover? <Link href="/support" className="text-brand-400 hover:underline">Visit support →</Link>
      </div>
    </div>
  );
}
