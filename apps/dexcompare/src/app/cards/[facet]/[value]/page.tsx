import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { type CardTileData } from "@/components/CardTile";
import { cardTileSelect, parsePageSize } from "@/lib/cards";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  resolveFacet,
  listFacetValues,
  FACET_KINDS,
  FACET_LABELS,
  MIN_PRICED_TO_INDEX_FACET,
  type FacetKind,
} from "@/lib/card-facets";
import { FacetCardGrid } from "./FacetCardGrid";

export const revalidate = 86400;

// Fixed prewarm head per facet kind (≤ 4 × this many renders per deploy) — never
// scale it with the catalogue. Everything else is generated on first request and
// then ISR-cached (dynamicParams defaults to true).
const PREWARM_PER_KIND = 6;

// THE cache fix for this route (with the searchParams removal below): without
// `generateStaticParams` Next 14 never registers a dynamic route for ISR, so
// `revalidate` above was a silent no-op — this path appeared in neither `routes`
// nor `dynamicRoutes` in .next/prerender-manifest.json, and every request paid
// four Postgres queries. Mirrors card/[id].
//
// The DB probe comes first deliberately: most facet slugs are derived from static
// config, so without it a build with an unreachable database would emit params
// and then fail inside the page render. Probe → throw → catch → [] → nothing is
// prerendered and every hub is generated on demand instead.
export async function generateStaticParams() {
  try {
    await prisma.card.count({ where: { hasLivePrice: true } });
    const groups = await Promise.all(FACET_KINDS.map((kind) => listFacetValues(kind)));
    // No popularity signal exists for facet values, so this is just a bounded
    // head per kind; the long tail warms itself on first request.
    return FACET_KINDS.flatMap((kind, i) =>
      groups[i].slice(0, PREWARM_PER_KIND).map((v) => ({ facet: kind as string, value: v.slug }))
    );
  } catch {
    return [];
  }
}

// NOTE: no `searchParams` here or in the page below — reading it is a dynamic API
// in Next 14 and silently voids `revalidate` for the whole route. Pagination
// lives in the <FacetCardGrid> client island.
export async function generateMetadata({
  params,
}: {
  params: { facet: string; value: string };
}): Promise<Metadata> {
  const facet = await resolveFacet(params.facet, params.value);
  if (!facet) notFound();
  const kindLabel = FACET_LABELS[facet.kind as FacetKind];
  const title = `${facet.label} Pokémon Cards — Prices & Full List`;
  const description = `Browse every ${facet.label} Pokémon card DexCompare tracks — compare live prices across stores and find the cheapest ${facet.label.toLowerCase()} singles.`;
  const priced = await prisma.card.count({ where: { ...facet.where, hasLivePrice: true } });
  return {
    title,
    description,
    // Page 1 is the only server-rendered (and only indexable) view. Thin hubs stay
    // noindex here; ?page=/?size= permutations canonicalise here and are tagged
    // noindex,follow by the island (same rule as /browse).
    alternates: { canonical: `/cards/${params.facet}/${params.value}` },
    ...(priced < MIN_PRICED_TO_INDEX_FACET ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${SITE_URL}/cards/${params.facet}/${params.value}`, ...(kindLabel ? {} : {}) },
  };
}

export default async function FacetPage({ params }: { params: { facet: string; value: string } }) {
  const facet = await resolveFacet(params.facet, params.value);
  if (!facet) notFound();
  const kindLabel = FACET_LABELS[facet.kind as FacetKind];

  const country = DEFAULT_COUNTRY;
  const fmt = (cents: number) => formatMoney(cents, "AUD");

  // Default view only (page 1, default page size) — searchParams-free, so this
  // render is cacheable. Deeper pages are fetched by the island.
  const size = parsePageSize(undefined);

  const [cards, total, priced, cheapest] = await Promise.all([
    prisma.card.findMany({
      where: facet.where,
      orderBy: [{ lowestPriceCents: { sort: "desc", nulls: "last" } }],
      select: cardTileSelect(country),
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

      {/* Grid + pagination. Page 1 is server-rendered (and cached); the island
          takes over when the URL carries ?page=/?size=. useSearchParams() needs a
          Suspense boundary for the route to stay statically renderable. */}
      <Suspense
        fallback={
          <div className="card-surface grid place-items-center p-16 text-center text-sm text-slate-400">Loading cards…</div>
        }
      >
        <FacetCardGrid
          facet={params.facet}
          value={params.value}
          label={facet.label}
          initialCards={cards as CardTileData[]}
          total={total}
        />
      </Suspense>

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
