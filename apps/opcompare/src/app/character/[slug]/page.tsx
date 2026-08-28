import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { cardTileSelect, parsePageNum, parsePageSize } from "@/lib/cards";
import { ONE_PIECE_SETS } from "@/lib/one-piece-sets";
import { DEFAULT_COUNTRY } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  characterStats,
  notablePrintings,
  popularCharacters,
  MIN_PRICED_PRINTINGS_TO_INDEX,
} from "@/lib/op-character-data";

export const revalidate = 86400;

interface Query {
  set?: string;
  era?: string;
  rarity?: string;
  sort?: string;
  page?: string;
  size?: string;
}

async function resolveCharacter(slug: string) {
  return characterStats(slug, DEFAULT_COUNTRY);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Query;
}): Promise<Metadata> {
  const character = await resolveCharacter(params.slug);
  if (!character) notFound();
  // Filter/sort/page permutations all canonicalise to the bare hub — noindex
  // them so the hub itself is the only indexable version (same rule as
  // /browse). Without this, a character with many printings multiplies into
  // hundreds of near-duplicate set × era × rarity × sort × page URLs.
  const isPermutation =
    Boolean(searchParams.set || searchParams.era || searchParams.rarity || searchParams.sort || searchParams.size) ||
    parsePageNum(searchParams.page) > 1;

  const title = `${character.name} Card Prices — Every Printing Compared`;
  const description =
    character.pricedCount > 0
      ? `${character.printingCount} tracked ${character.name} printings. Cheapest from ${formatMoney(character.cheapestCents ?? 0, "AUD")}. Compare every ${character.name} card price across stores, updated daily.`
      : `Every tracked ${character.name} printing across the One Piece Card Game — ${character.printingCount} cards. Prices update as our stores are checked.`;

  return {
    title,
    description,
    alternates: { canonical: `/character/${character.slug}` },
    // Thin hubs (too few priced printings yet) stay crawlable but out of the
    // index until the importer prices enough of them — no separate promotion
    // job needed, this just re-evaluates on every ISR regenerate. Filtered
    // permutations are noindexed for a different reason (duplication), above.
    ...(character.pricedCount < MIN_PRICED_PRINTINGS_TO_INDEX || isPermutation
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: { title, description, url: `${SITE_URL}/character/${character.slug}` },
  };
}

const SORTS = [
  { key: "relevance", label: "Relevance" },
  { key: "price_desc", label: "Price: high → low" },
  { key: "price_asc", label: "Price: low → high" },
  { key: "number", label: "Set, then number" },
] as const;

export default async function CharacterPage({ params, searchParams }: { params: { slug: string }; searchParams: Query }) {
  const character = await resolveCharacter(params.slug);
  if (!character) notFound();

  const country = DEFAULT_COUNTRY;
  const fmt = (cents: number) => formatMoney(cents, "AUD" as const);

  const [notable, siblings] = await Promise.all([notablePrintings(character.slug, country), popularCharacters(24)]);

  // Sets this character appears in, with era ("series") metadata for the era filter.
  const setsForCharacter = ONE_PIECE_SETS.filter((s) => character.setCodes.includes(s.code));
  const eras = [...new Set(setsForCharacter.map((s) => s.series))];

  // ---- Filters --------------------------------------------------------------
  const where: Record<string, unknown> = { characterSlug: character.slug };
  if (searchParams.set) where.setCode = { in: searchParams.set.split(",").filter(Boolean) };
  if (searchParams.rarity) where.rarity = { in: searchParams.rarity.split(",").filter(Boolean) };
  if (searchParams.era) {
    const eraCodes = setsForCharacter.filter((s) => searchParams.era!.split(",").includes(s.series)).map((s) => s.code);
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
      { "@type": "ListItem", position: 3, name: character.name, item: `${SITE_URL}/character/${character.slug}` },
    ],
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${character.name} Card Prices`,
    url: `${SITE_URL}/character/${character.slug}`,
    description: `Every tracked ${character.name} printing with live prices.`,
    isPartOf: { "@type": "WebSite", name: "OPCompare", url: SITE_URL },
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
      q: `How much does a ${character.name} card cost?`,
      a:
        character.pricedCount > 0
          ? `The cheapest tracked ${character.name} printing starts from ${fmt(character.cheapestCents!)}, and the most valuable is ${fmt(character.mostValuableCents!)}. OPCompare tracks ${character.printingCount} ${character.name} printings across every One Piece Card Game set.`
          : `We're still tracking down live prices for ${character.name}. Check back soon, or browse the printings below.`,
    },
    {
      q: `How many ${character.name} cards are there?`,
      a: `OPCompare tracks ${character.printingCount} ${character.name} printings across ${setsForCharacter.length} sets, including base forms and Leader and Character printings, including alt-arts.`,
    },
    {
      q: `What's the cheapest way to get a ${character.name} card?`,
      a:
        character.cheapestCents != null
          ? `The lowest-priced tracked printing is from ${fmt(character.cheapestCents)} — filter the grid below by set or era to find a specific printing, or sort by price to see every affordable option first.`
          : `Filter the grid below by set, era or rarity to browse every tracked ${character.name} printing.`,
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
          <span className="text-slate-300">{character.name}</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{character.name} — card prices, every printing</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          OPCompare tracks <strong className="text-slate-200">{character.printingCount}</strong> {character.name} printings
          across {setsForCharacter.length} {setsForCharacter.length === 1 ? "set" : "sets"}
          {character.pricedCount > 0 ? (
            <>
              , with {character.pricedCount} priced right now — from{" "}
              <strong className="text-slate-200">{fmt(character.cheapestCents!)}</strong> up to{" "}
              <strong className="text-slate-200">{fmt(character.mostValuableCents!)}</strong> for the most valuable printing.
            </>
          ) : (
            <>. We&apos;re still tracking down live prices for this character — check back soon.</>
          )}{" "}
          {character.domains.length > 0 && (
            <>
              Browse more{" "}
              {character.domains.map((d, i) => (
                <span key={d}>
                  <Link href={`/browse?domain=${encodeURIComponent(d)}`} className="text-brand-400 hover:underline">
                    {d}-type
                  </Link>
                  {i < character.domains.length - 1 ? ", " : " "}
                </span>
              ))}
              cards.
            </>
          )}
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Printings tracked" value={String(character.printingCount)} />
        <Stat label="Cheapest" value={character.cheapestCents != null ? fmt(character.cheapestCents) : "—"} />
        <Stat label="Most valuable" value={character.mostValuableCents != null ? fmt(character.mostValuableCents) : "—"} />
        <Stat
          label="One-of-each basket"
          value={character.basketCents != null ? fmt(character.basketCents) : "—"}
          hint={`Buying the cheapest copy of all ${character.pricedCount} priced printings`}
        />
      </div>

      {/* Notable printings — useful without scrolling the full grid */}
      {notable.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Notable {character.name} printings</h2>
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
            All {character.name} printings <span className="text-slate-500">({totalMatching})</span>
          </h2>
        </div>

        {/* Server-rendered filter/sort links (no client JS required, crawlable) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/character/${character.slug}${qs({ sort: s.key === "relevance" ? undefined : s.key, page: undefined })}`}
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
                href={`/character/${character.slug}${qs({ era: searchParams.era === era ? undefined : era, page: undefined })}`}
                className={`chip border px-2.5 py-1 text-xs ${
                  searchParams.era === era ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
                }`}
              >
                {era}
              </Link>
            ))}
          </div>
        )}
        {character.rarities.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rarity</span>
            {character.rarities.map((r) => (
              <Link
                key={r}
                href={`/character/${character.slug}${qs({ rarity: searchParams.rarity === r ? undefined : r, page: undefined })}`}
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
              <Link href={`/character/${character.slug}`} className="btn-ghost mt-3">Clear filters</Link>
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
              <Link href={`/character/${character.slug}${qs({ page: String(page - 1) })}`} className="btn-ghost text-sm">← Previous</Link>
            )}
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={`/character/${character.slug}${qs({ page: String(page + 1) })}`} className="btn-ghost text-sm">Next →</Link>
            )}
          </div>
        )}
      </section>

      {/* Sibling character nav — crawl depth + discovery */}
      {siblings.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Other One Piece</h2>
          <div className="flex flex-wrap gap-2">
            {siblings
              .filter((s) => s.slug !== character.slug)
              .map((s) => (
                <Link key={s.slug} href={`/character/${s.slug}`} className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">
                  {s.name}
                </Link>
              ))}
            <Link href="/browse" className="chip border border-ink-700 px-3 py-1.5 text-sm hover:border-brand-500">All cards →</Link>
          </div>
        </section>
      )}

      {/* FAQ — visible content backing the FAQPage structured data above */}
      <section className="card-surface p-6">
        <h2 className="text-lg font-extrabold text-white">{character.name} — FAQ</h2>
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
