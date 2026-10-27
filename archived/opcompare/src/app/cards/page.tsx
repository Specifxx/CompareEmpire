import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { FACET_KINDS, FACET_LABELS, listFacetValues } from "@/lib/card-facets";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Browse One Piece Cards by Type, Rarity & Era — OPCompare",
  description: "Every way to browse the One Piece Card Game price database on OPCompare — by card type, rarity, printing and era.",
  alternates: { canonical: "/cards" },
  openGraph: { title: "Browse One Piece Cards", url: `${SITE_URL}/cards` },
};

export default async function CardsIndexPage() {
  const groups = await Promise.all(FACET_KINDS.map(async (kind) => ({ kind, label: FACET_LABELS[kind], values: await listFacetValues(kind) })));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Browse One Piece cards</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Jump straight to the cards you&apos;re after — by type, rarity, printing or era. Every page compares live
          prices across stores.
        </p>
      </div>
      {groups.map((g) => (
        <section key={g.kind}>
          <h2 className="mb-3 text-lg font-bold text-white">{g.label}</h2>
          <div className="flex flex-wrap gap-2">
            {g.values.map((v) => (
              <Link key={v.slug} href={`/cards/${v.kind}/${v.slug}`} className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">
                {v.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
