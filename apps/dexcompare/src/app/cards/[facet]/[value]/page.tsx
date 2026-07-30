import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { cardTileSelect, parsePageNum, parsePageSize } from "@/lib/cards";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { resolveFacet, FACET_LABELS, MIN_PRICED_TO_INDEX_FACET, type FacetKind } from "@/lib/card-facets";

export const revalidate = 86400;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { facet: string; value: string };
  searchParams: { page?: string; size?: string };
}): Promise<Metadata> {
  const facet = await resolveFacet(params.facet, params.value);
  if (!facet) notFound();
  const kindLabel = FACET_LABELS[facet.kind as FacetKind];
  const title = `${facet.label} Pokémon Cards — Prices & Full List`;
  const description = `Browse every ${facet.label} Pokémon card DexCompare tracks — compare live prices across stores and find the cheapest ${facet.label.toLowerCase()} singles.`;
  const priced = await prisma.card.count({ where: { ...facet.where, hasLivePrice: true } });
  // Only page 1 claims the canonical (same rule as /browse).
  const isPermutation = parsePageNum(searchParams.page) > 1 || Boolean(searchParams.size);
  return {
    title,
    description,
    alternates: { canonical: `/cards/${params.facet}/${params.value}` },
    ...(priced < MIN_PRICED_TO_INDEX_FACET || isPermutation ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${SITE_URL}/cards/${params.facet}/${params.value}`, ...(kindLabel ? {} : {}) },
  };
}

export default async function FacetPage({
  params,
  searchParams,
}: {
  params: { facet: string; value: string };
  searchParams: { page?: string; size?: string };
}) {
  const facet = await resolveFacet(params.facet, params.value);
  if (!facet) notFound();
  const kindLabel = FACET_LABELS[facet.kind as FacetKind];

  const country = DEFAULT_COUNTRY;
  const fmt = (cents: number) => formatMoney(cents, "AUD");

  const page = parsePageNum(searchParams.page);
  const size = parsePageSize(searchParams.size);

  const [cards, total, priced, cheapest] = await Promise.all([
    prisma.card.findMany({
      where: facet.where,
      orderBy: [{ lowestPriceCents: { sort: "desc", nulls: "last" } }],
      select: cardTileSelect(country),
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.card.count({ where: facet.where }),
    prisma.card.count({ where: { ...facet.where, hasLivePrice: true } }),
    prisma.card.findFirst({
      where: { ...facet.where, hasLivePrice: true },
      orderBy: [{ lowestPriceCents: { sort: "asc", nulls: "last" } }],
      select: { lowestPriceCents: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Database", item: `${SITE_URL}/browse` },
      { "@type": "ListItem", position: 3, name: facet.label, item: `${SITE_URL}/cards/${params.facet}/${params.value}` },
    ],
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${facet.label} Pokémon Card Prices`,
    url: `${SITE_URL}/cards/${params.facet}/${params.value}`,
    description: `Every tracked ${facet.label} Pokémon card with live prices.`,
    isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
  };

  const faqs = [
    {
      q: `What is a ${facet.label} Pokémon card?`,
      a:
        facet.kind === "type"
          ? `"${facet.label}" is one of the three Pokémon TCG card supertypes — Pokémon, Trainer and Energy. DexCompare tracks ${total} ${facet.label} cards.`
          : facet.kind === "rarity"
          ? `"${facet.label}" is a Pokémon TCG rarity tier. DexCompare tracks ${total} cards printed at ${facet.label} rarity across every set.`
          : facet.kind === "era"
          ? `${facet.label} is a Pokémon TCG set series/era. DexCompare tracks ${total} cards across every ${facet.label} set.`
          : `A ${facet.label} printing is a special, non-standard-pack Pokémon card. DexCompare tracks ${total} Promo cards.`,
    },
    {
      q: `How much do ${facet.label} cards cost?`,
      a:
        priced > 0
          ? `${priced} of the ${total} tracked ${facet.label} cards are priced right now, starting from ${fmt(cheapest?.lowestPriceCents ?? 0)}. Click any card to see the full store comparison.`
          : `We're still tracking down live prices for ${facet.label} cards. Check back soon.`,
    },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, collection, faqLd]) }} />

      <div>
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-slate-300">Database</Link>
          <span>/</span>
          <span className="text-slate-300">{facet.label}</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          {facet.label} Pokémon cards — prices &amp; full list
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          DexCompare tracks <strong className="text-slate-200">{total}</strong> {facet.label} {kindLabel === "Card type" ? "" : "Pokémon "}cards
          {priced > 0 ? (
            <>
              , {priced} priced right now from <strong className="text-slate-200">{fmt(cheapest?.lowestPriceCents ?? 0)}</strong>.
            </>
          ) : (
            <>. Prices update as our stores are checked.</>
          )}{" "}
          Compare live prices across stores to find the cheapest {facet.label.toLowerCase()} singles.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center text-slate-400">
          <p className="text-lg font-semibold text-white">No {facet.label} cards match this page</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {(cards as CardTileData[]).map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/cards/${params.facet}/${params.value}?page=${page - 1}`} className="btn-ghost text-sm">← Previous</Link>
          )}
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/cards/${params.facet}/${params.value}?page=${page + 1}`} className="btn-ghost text-sm">Next →</Link>
          )}
        </div>
      )}

      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">{facet.label} — FAQ</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-white">{f.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
