import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support & Help Center — OPCompare",
  description: "Get help with OPCompare — how prices work, how to report an issue, and where to go for buying guides and account help.",
  alternates: { canonical: "/support" },
  openGraph: { title: "Support & Help Center", url: `${SITE_URL}/support` },
};

const TOPICS = [
  {
    title: "How prices work",
    desc: "What the market guide is, why stores show different prices, and how delivered cost is calculated.",
    links: [
      { href: "/guides/why-one piece-card-prices-differ-between-stores", label: "Why prices differ between stores" },
      { href: "/stores", label: "Every store we track" },
    ],
  },
  {
    title: "New to collecting?",
    desc: "Start with the beginner's path through everything you need to know.",
    links: [{ href: "/learn", label: "Learn One Piece Card Game collecting →" }],
  },
  {
    title: "Alerts & tracking",
    desc: "Get emailed when a price drops or a sold-out product restocks.",
    links: [
      { href: "/wishlist", label: "Wishlist & price-drop alerts" },
      { href: "/restock", label: "Restock tracker" },
    ],
  },
  {
    title: "Report an issue",
    desc: "Spot a wrong price, a broken link, or a missing store?",
    links: [{ href: "/stores/suggest", label: "Suggest a store" }],
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-300">Home</Link>
        <span>/</span>
        <span className="text-slate-300">Support</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Support &amp; help center</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Most questions are answered below. Can&apos;t find what you need? Email us directly.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <div key={t.title} className="card-surface p-4">
            <h2 className="font-bold text-white">{t.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.desc}</p>
            <div className="mt-3 flex flex-col gap-1">
              {t.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-brand-400 hover:underline">{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card-surface mt-8 p-6 text-center">
        <h2 className="text-lg font-bold text-white">Still stuck?</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Send us a message — we read every one and usually reply within a day or two.
        </p>
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${SITE_NAME} support`)}`} className="btn-primary mt-4 inline-flex">
          Email {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
