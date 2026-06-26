import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Filters } from "@/components/Filters";
import { ActiveFilters } from "@/components/ActiveFilters";
import { SortSelect } from "@/components/SortSelect";
import { CardTile } from "@/components/CardTile";
import { Pagination } from "@/components/Pagination";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { AdSlot } from "@/components/AdSlot";
import { BrowseHint } from "@/components/BrowseHint";
import {
  buildCardOrderBy,
  buildCardWhere,
  cardTileSelect,
  CardQuery,
  parsePageNum,
  parsePageSize,
} from "@/lib/cards";
import { getCountry } from "@/lib/get-country";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }: { searchParams: CardQuery }): Metadata {
  // Search-result and filtered views are infinite query-string permutations — keep
  // them out of the index (and never let them claim to be the canonical /browse).
  const isFiltered = Boolean(searchParams.q || searchParams.domain || searchParams.rarity || searchParams.type || searchParams.set);
  return {
    title: "Browse the Pokémon card database",
    description:
      "Search and filter every Pokémon TCG card and compare live prices across stores in Australia, New Zealand, the US and the UK to find the cheapest place to buy.",
    alternates: { canonical: "/browse" },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BrowsePage({ searchParams }: { searchParams: CardQuery }) {
  const country = getCountry();
  const where = buildCardWhere(searchParams, country);
  const orderBy = buildCardOrderBy(searchParams.sort, country);
  const size = parsePageSize(searchParams.size);
  const page = parsePageNum(searchParams.page);

  const [total, cards] = await Promise.all([
    prisma.card.count({ where }),
    prisma.card.findMany({
      where,
      orderBy,
      select: cardTileSelect(country),
      skip: (page - 1) * size,
      take: size,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / size));

  // Structured data only on the canonical, unfiltered first page (filtered/search
  // permutations are noindex — see generateMetadata).
  const isFiltered = Boolean(searchParams.q || searchParams.domain || searchParams.rarity || searchParams.type || searchParams.set);
  const itemListJsonLd =
    !isFiltered && page === 1
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Pokémon Card Database",
          url: `${SITE_URL}/browse`,
          description: "Every Pokémon TCG card with live prices compared across stores.",
          isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: cards.slice(0, 24).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/card/${c.slug ?? c.id}`,
              name: c.name,
            })),
          },
        }
      : null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}
      <Filters />

      <section className="min-w-0 flex-1">
        <AdSlot format="horizontal" height={90} className="mb-4" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-white">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "card" : "cards"}
            {searchParams.q && (
              <> for <span className="text-brand-400">“{searchParams.q}”</span></>
            )}
            {total > 0 && <span className="text-slate-600"> · page {page} of {totalPages}</span>}
          </p>
          <div className="flex items-center gap-3">
            <PageSizeSelect size={size} />
            <SortSelect />
          </div>
        </div>

        <ActiveFilters />

        <BrowseHint />

        {cards.length === 0 ? (
          <div className="card-surface grid place-items-center p-16 text-center">
            <p className="text-lg font-semibold text-white">
              {total > 0 ? "Nothing on this page" : "No cards found"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {total > 0 ? "Try an earlier page." : "Try adjusting your filters or search."}
            </p>
            <Link href="/browse" className="btn-primary mt-4">Reset</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {cards.map((c) => (
                <CardTile key={c.id} card={c} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} params={searchParams as Record<string, string | undefined>} />
          </>
        )}
      </section>
    </div>
  );
}
