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
  // Deep pages (page>1) are noindex too: only page 1 claims the bare /browse
  // canonical, so the static canonical stays valid and pages don't compete.
  const isFiltered = Boolean(
    searchParams.q ||
      searchParams.domain ||
      searchParams.rarity ||
      searchParams.type ||
      searchParams.set ||
      searchParams.variant ||
      searchParams.sig ||
      searchParams.promo ||
      searchParams.priced ||
      searchParams.min ||
      searchParams.max ||
      searchParams.sort
  );
  const page = parsePageNum(searchParams.page);
  return {
    title: "Browse the Pokémon card database",
    description:
      "Search and filter every Pokémon TCG card and compare live prices across stores in Australia, New Zealand, the US and the UK to find the cheapest place to buy.",
    alternates: { canonical: "/browse" },
    ...(isFiltered || page > 1 ? { robots: { index: false, follow: true } } : {}),
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
  const isFiltered = Boolean(
    searchParams.q ||
      searchParams.domain ||
      searchParams.rarity ||
      searchParams.type ||
      searchParams.set ||
      searchParams.variant ||
      searchParams.sig ||
      searchParams.promo ||
      searchParams.priced ||
      searchParams.min ||
      searchParams.max ||
      searchParams.sort
  );
  const isCanonical = !isFiltered && page === 1;
  const itemListJsonLd = isCanonical
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

  const faqJsonLd = isCanonical
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        url: `${SITE_URL}/browse`,
        mainEntity: BROWSE_FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <Filters />

      <section className="min-w-0 flex-1">
        <h1 className="mb-4 text-2xl font-extrabold text-white">Pokémon card database</h1>
        <AdSlot format="horizontal" height={90} className="mb-4" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-white">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "card" : "cards"}
            {searchParams.q && (
              <> for <span className="text-brand-400">"{searchParams.q}"</span></>
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

        {/* FAQ — canonical page only; answers real buyer questions and enables
            FAQPage rich results for the database's highest-traffic landing page. */}
        {isCanonical && (
          <section className="card-surface mt-8 divide-y divide-ink-700 overflow-hidden">
            <h2 className="px-6 py-4 text-lg font-extrabold text-white">Frequently asked questions</h2>
            {BROWSE_FAQS.map((f) => (
              <details key={f.q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-200 hover:text-white">
                  {f.q}
                  <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden>▾</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </section>
        )}
      </section>
    </div>
  );
}

const BROWSE_FAQS = [
  {
    q: "Which Pokémon card sets are in the database?",
    a: "The database covers all major English-language Pokémon TCG sets — Scarlet & Violet, Sword & Shield, Sun & Moon, XY, and older eras — plus promos, special releases, and regional variants. New sets are added as cards are listed by the stores we track.",
  },
  {
    q: "How do I find the cheapest price for a specific Pokémon card?",
    a: "Search for the card by name using the search bar, then open its card page. The price table lists every store's current live price sorted by total delivered cost — card price plus postage — so the best deal is always at the top. You can also add the card to your wishlist and receive an email when its price drops.",
  },
  {
    q: "Why does the same Pokémon appear more than once in the database?",
    a: "A single Pokémon like Charizard or Pikachu can appear in dozens of different sets and promos, each with its own artwork, collector number, rarity, and price. DexCompare tracks every printing separately so you can compare them and find the one that fits your collection or budget — sometimes a reprint is far cheaper than the original.",
  },
  {
    q: "How often are card prices updated?",
    a: "Prices refresh daily. Our crawlers check each store's live listings once every 24 hours, so the comparison always reflects the most recent data from each retailer. Stock levels and prices can change between our update and when you visit, so always confirm the final total at checkout before buying.",
  },
];
