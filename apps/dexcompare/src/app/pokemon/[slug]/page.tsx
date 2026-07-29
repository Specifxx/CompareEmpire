import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { cardTileSelect, parsePageNum, parsePageSize } from "@/lib/cards";
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

export const revalidate = 86400;

interface Query {
  set?: string;
  era?: string;
  rarity?: string;
  sort?: string;
  page?: string;
  size?: string;
}

async function resolveSpecies(slug: string) {
  return speciesStats(slug, DEFAULT_COUNTRY);
}

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
    alternates: { canonical: `/pokemon/${species.slug}` },
    // Thin hubs (too few priced printings yet) stay crawlable but out of the
    // index until the importer prices enough of them — no separate promotion
    // job needed, this just re-evaluates on every ISR regenerate.
    ...(species.pricedCount < MIN_PRICED_PRINTINGS_TO_INDEX ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${SITE_URL}/pokemon/${species.slug}` },
  };
}

const SORTS = [
  { key: "relevance", label: "Relevance" },
  { key: "price_desc", label: "Price: high → low" },
  { key: "price_asc", label: "Price: low → high" },
  { key: "number", label: "Set, then number" },
] as const;

export default async function SpeciesPage({ params, searchParams }: { params: { slug: string }; searchParams: Query }) {
  const species = await resolveSpecies(params.slug);
  if (!species) notFound();

  const country = DEFAULT_COUNTRY;
  const fmt = (cents: number) => formatMoney(cents, "AUD" as const);

  const [notable, siblings] = await Promise.all([notablePrintings(species.slug, country), popularSpecies(24)]);

  // Sets this species appears in, with era ("series") metadata for the era filter.
  const setsForSpecies = POKEMON_SETS.filter((s) => species.setCodes.includes(s.code));
  const eras = [...new Set(setsForSpecies.map((s) => s.series))];

  // ---- Filters --------------------------------------------------------------
  const where: Record<string, unknown> = { speciesSlug: species.slug };
  if (searchParams.set) where.setCode = { in: searchParams.set.split(",").filter(Boolean) };
  if (searchParams.rarity) where.rarity = { in: searchParams.rarity.split(",").filter(Boolean) };
  if (searchParams.era) {
    const eraCodes = setsForSpecies.filter((s) => searchParams.era!.split(",").includes(s.series)).map((s) => s.code);
    where.setCode = where.setCode ? { in: eraCodes.filter((c) => (where.setCode as { in: string[] }).in.includes(c)) } : { in: eraCodes };
  }

  // ---- Sort -------------------------------------------------------------
  // Default "relevance": price descending is a practical proxy for "chase
  // cards and popular sets first" — the printings collectors search for are
  // overwhelmingly the expensive ones. Real per-search-term relevance would
  // need query-log data this app doesn't have.
  const orderBy =
    searchParams.sort === "price_asc"
      ? [{ lowestPriceCents: { sort: "asc", nulls: "last" } }]
      : searchParams.sort === "number"
      ? [{ setCode: "asc" }, { collectorNumber: "asc" }]
      : [{ lowestPriceCents: { sort: "desc", nulls: "last" } }];

  const size = parsePageSize(searchParams.size);
  const page = parsePageNum(searchParams.page);

  const [printings, totalMatching] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: orderBy as never,
      select: cardTileSelect(country),
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.card.count({ where: where as never }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalMatching / size));

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

  const qs = (overrides: Record<string, string | undefined>) => {
    const merged = { ...searchParams, ...overrides };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
    const s = usp.toString();
    return s ? `?${s}` : "";
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

      {/* Filters: set, era, rarity */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            All {species.name} printings <span className="text-slate-500">({totalMatching})</span>
          </h2>
        </div>

        {/* Server-rendered filter/sort links (no client JS required, crawlable) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/pokemon/${species.slug}${qs({ sort: s.key === "relevance" ? undefined : s.key, page: undefined })}`}
              className={`chip border px-3 py-1 text-xs ${
                (searchParams.sort ?? "relevance") === s.key ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        {eras.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Era</span>
            {eras.map((era) => (
              <Link
                key={era}
                href={`/pokemon/${species.slug}${qs({ era: searchParams.era === era ? undefined : era, page: undefined })}`}
                className={`chip border px-2.5 py-1 text-xs ${
                  searchParams.era === era ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
                }`}
              >
                {era}
              </Link>
            ))}
          </div>
        )}
        {species.rarities.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rarity</span>
            {species.rarities.map((r) => (
              <Link
                key={r}
                href={`/pokemon/${species.slug}${qs({ rarity: searchParams.rarity === r ? undefined : r, page: undefined })}`}
                className={`chip border px-2.5 py-1 text-xs ${
                  searchParams.rarity === r ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
                }`}
              >
                {r}
              </Link>
            ))}
          </div>
        )}

        {printings.length === 0 ? (
          <div className="card-surface grid place-items-center p-12 text-center text-slate-400">
            <div>
              <p className="text-lg font-semibold text-white">No printings match these filters</p>
              <Link href={`/pokemon/${species.slug}`} className="btn-ghost mt-3">Clear filters</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {(printings as CardTileData[]).map((c) => (
              <CardTile key={c.id} card={c} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link href={`/pokemon/${species.slug}${qs({ page: String(page - 1) })}`} className="btn-ghost text-sm">← Previous</Link>
            )}
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={`/pokemon/${species.slug}${qs({ page: String(page + 1) })}`} className="btn-ghost text-sm">Next →</Link>
            )}
          </div>
        )}
      </section>

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
