import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { cardTileSelect, parsePageSize } from "@/lib/cards";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  speciesStats,
  notablePrintings,
  popularSpecies,
  MIN_PRICED_PRINTINGS_TO_INDEX,
} from "@/lib/pokemon-species-data";
import { SpeciesPrintings, SpeciesPrintingsView } from "./SpeciesPrintings";

export const revalidate = 86400;

// Fixed prewarm head — the most-searched species only. NEVER scale this with the
// number of species; the long tail is generated on first request and then
// ISR-cached (dynamicParams defaults to true).
const PREWARM_SPECIES = 100;

// THE cache fix for this route (with the searchParams removal below): without
// `generateStaticParams` Next 14 never registers a dynamic route for ISR, so
// `revalidate` above was a silent no-op — this path appeared in neither `routes`
// nor `dynamicRoutes` in .next/prerender-manifest.json and every request paid a
// full species render against Postgres. Mirrors card/[id].
//
// try/catch → [] so a build with an unreachable database still exits 0 (it just
// prerenders nothing and generates each hub on demand).
export async function generateStaticParams() {
  try {
    const busiest = await prisma.card.groupBy({
      by: ["speciesSlug"],
      where: { speciesSlug: { not: null }, hasLivePrice: true },
      _count: { speciesSlug: true },
      orderBy: { _count: { speciesSlug: "desc" } },
      take: PREWARM_SPECIES,
    });
    return busiest.flatMap((g) => (g.speciesSlug ? [{ slug: g.speciesSlug }] : []));
  } catch {
    return [];
  }
}

async function resolveSpecies(slug: string) {
  return speciesStats(slug, DEFAULT_COUNTRY);
}

// NOTE: no `searchParams` here or in the page below — reading it is a dynamic API
// in Next 14 and silently voids `revalidate` for the whole route. The
// filter/sort/paginate UI is the <SpeciesPrintings> client island.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const species = await resolveSpecies(params.slug);
  if (!species) notFound();

  const title = `${species.name} Card Prices — Every Printing Compared`;
  const description =
    species.pricedCount > 0
      ? `${species.printingCount} tracked ${species.name} printings. Cheapest from ${formatMoney(species.cheapestCents ?? 0, "AUD")}. Compare every ${species.name} card price across stores, updated daily.`
      : `Every tracked ${species.name} printing across the Pokémon TCG — ${species.printingCount} cards. Prices update as our stores are checked.`;

  return {
    title,
    description,
    // Filter/sort/page permutations all canonicalise to the bare hub, so the hub
    // is the only version that competes in the index — without that, a species
    // with many printings multiplies into hundreds of near-duplicate
    // set × era × rarity × sort × page URLs. The permutation-specific
    // noindex,follow is now applied client-side by <SpeciesPrintings> (the head
    // is cached and can't vary per query string — reading searchParams here is
    // what made the whole route dynamic).
    alternates: { canonical: `/pokemon/${species.slug}` },
    // Thin hubs (too few priced printings yet) stay crawlable but out of the
    // index until the importer prices enough of them — no separate promotion
    // job needed, this just re-evaluates on every ISR regenerate.
    ...(species.pricedCount < MIN_PRICED_PRINTINGS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${SITE_URL}/pokemon/${species.slug}` },
  };
}

export default async function SpeciesPage({ params }: { params: { slug: string } }) {
  const species = await resolveSpecies(params.slug);
  if (!species) notFound();

  const country = DEFAULT_COUNTRY;
  const fmt = (cents: number) => formatMoney(cents, "AUD" as const);

  const [notable, siblings] = await Promise.all([notablePrintings(species.slug, country), popularSpecies(24)]);

  // Sets this species appears in, with era ("series") metadata for the era filter.
  const setsForSpecies = POKEMON_SETS.filter((s) => species.setCodes.includes(s.code));
  const eras = [...new Set(setsForSpecies.map((s) => s.series))];

  // ---- Default (searchParams-free, cacheable) view --------------------------
  // Unfiltered, default-sorted page 1 — the only indexable view and the only one
  // Googlebot ever requests. Filters/sort/pagination happen in the client island
  // against /pokemon/[slug]/printings; reading searchParams here would put the
  // whole route back on per-request SSR.
  //
  // Default "relevance": price descending is a practical proxy for "chase cards
  // and popular sets first" — the printings collectors search for are
  // overwhelmingly the expensive ones. Real per-search-term relevance would need
  // query-log data this app doesn't have.
  const size = parsePageSize(undefined);
  const printings = await prisma.card.findMany({
    where: { speciesSlug: species.slug },
    orderBy: [{ lowestPriceCents: { sort: "desc", nulls: "last" } }] as never,
    select: cardTileSelect(country),
    take: size,
  });
  // Unfiltered total — species.printingCount is already the count of every
  // printing of this species (no extra query needed).
  const totalMatching = species.printingCount;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Database", item: `${SITE_URL}/browse` },
      { "@type": "ListItem", position: 3, name: species.name, item: `${SITE_URL}/pokemon/${species.slug}` },
    ],
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${species.name} Card Prices`,
    url: `${SITE_URL}/pokemon/${species.slug}`,
    description: `Every tracked ${species.name} printing with live prices.`,
    isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
  };
  const itemList = notable.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: notable.map((n, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${n.card.name} (${n.card.setName})`,
          url: `${SITE_URL}/card/${n.card.slug ?? n.card.id}`,
        })),
      }
    : null;

  const faqs = [
    {
      q: `How much does a ${species.name} card cost?`,
      a:
        species.pricedCount > 0
          ? `The cheapest tracked ${species.name} printing starts from ${fmt(species.cheapestCents!)}, and the most valuable is ${fmt(species.mostValuableCents!)}. DexCompare tracks ${species.printingCount} ${species.name} printings across every Pokémon TCG set.`
          : `We're still tracking down live prices for ${species.name}. Check back soon, or browse the printings below.`,
    },
    {
      q: `How many ${species.name} cards are there?`,
      a: `DexCompare tracks ${species.printingCount} ${species.name} printings across ${setsForSpecies.length} sets, including base forms and mechanic variants like ex, GX, V, VMAX and VSTAR.`,
    },
    {
      q: `What's the cheapest way to get a ${species.name} card?`,
      a:
        species.cheapestCents != null
          ? `The lowest-priced tracked printing is from ${fmt(species.cheapestCents)} — filter the grid below by set or era to find a specific printing, or sort by price to see every affordable option first.`
          : `Filter the grid below by set, era or rarity to browse every tracked ${species.name} printing.`,
    },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList ? [breadcrumb, collection, faqLd, itemList] : [breadcrumb, collection, faqLd]) }}
      />

      {/* Breadcrumb + hero */}
      <div>
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-slate-300">Database</Link>
          <span>/</span>
          <span className="text-slate-300">{species.name}</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{species.name} — card prices, every printing</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          DexCompare tracks <strong className="text-slate-200">{species.printingCount}</strong> {species.name} printings
          across {setsForSpecies.length} {setsForSpecies.length === 1 ? "set" : "sets"}
          {species.pricedCount > 0 ? (
            <>
              , with {species.pricedCount} priced right now — from{" "}
              <strong className="text-slate-200">{fmt(species.cheapestCents!)}</strong> up to{" "}
              <strong className="text-slate-200">{fmt(species.mostValuableCents!)}</strong> for the most valuable printing.
            </>
          ) : (
            <>. We&apos;re still tracking down live prices for this species — check back soon.</>
          )}{" "}
          {species.domains.length > 0 && (
            <>
              Browse more{" "}
              {species.domains.map((d, i) => (
                <span key={d}>
                  <Link href={`/browse?domain=${encodeURIComponent(d)}`} className="text-brand-400 hover:underline">
                    {d}-type
                  </Link>
                  {i < species.domains.length - 1 ? ", " : " "}
                </span>
              ))}
              cards.
            </>
          )}
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Printings tracked" value={String(species.printingCount)} />
        <Stat label="Cheapest" value={species.cheapestCents != null ? fmt(species.cheapestCents) : "—"} />
        <Stat label="Most valuable" value={species.mostValuableCents != null ? fmt(species.mostValuableCents) : "—"} />
        <Stat
          label="One-of-each basket"
          value={species.basketCents != null ? fmt(species.basketCents) : "—"}
          hint={`Buying the cheapest copy of all ${species.pricedCount} priced printings`}
        />
      </div>

      {/* Notable printings — useful without scrolling the full grid */}
      {notable.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Notable {species.name} printings</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {notable.map((n) => (
              <div key={n.card.id} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{n.label}</span>
                <CardTile card={n.card} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters + grid + pagination. useSearchParams() bails the island out of
          prerendering, so the FALLBACK is what lands in the cached HTML — it has
          to be the real unfiltered default view (that's what gets indexed), not a
          spinner. The island hydrates over it with identical markup and only
          changes anything once the URL carries a filter/sort/page. */}
      <Suspense
        fallback={
          <SpeciesPrintingsView
            slug={species.slug}
            speciesName={species.name}
            eras={eras}
            rarities={species.rarities}
            cards={printings as CardTileData[]}
            total={totalMatching}
            query={{ page: 1, size }}
          />
        }
      >
        <SpeciesPrintings
          slug={species.slug}
          speciesName={species.name}
          eras={eras}
          rarities={species.rarities}
          initialCards={printings as CardTileData[]}
          initialTotal={totalMatching}
        />
      </Suspense>

      {/* Sibling species nav — crawl depth + discovery */}
      {siblings.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Other Pokémon</h2>
          <div className="flex flex-wrap gap-2">
            {siblings
              .filter((s) => s.slug !== species.slug)
              .map((s) => (
                <Link key={s.slug} href={`/pokemon/${s.slug}`} className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">
                  {s.name}
                </Link>
              ))}
            <Link href="/browse" className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">All cards →</Link>
          </div>
        </section>
      )}

      {/* FAQ — visible content backing the FAQPage structured data above */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">{species.name} — FAQ</h2>
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface p-3" title={hint}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="num mt-0.5 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
