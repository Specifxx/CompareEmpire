import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Fold, Folds } from "@/components/Fold";
import { HubFaqSection, HubSummaryText } from "@/components/HubSummary";
import { Icon } from "@/components/Icon";
import { ProductGrid } from "@/components/ProductGrid";
import { Empty, Section } from "@/components/Section";
import { StockFilter } from "@/components/StockFilter";
import { money, plural } from "@/lib/format";
import { hubTitle, titleText } from "@/lib/hub-copy";
import { pokemonCounts, pokemonPageData } from "@/lib/hub-data";
import { hubSummary } from "@/lib/hub-summary";
import { detailIndexed } from "@/lib/index-tiers";
import { POKEMON, POKEMON_BY_SLUG, POKEMON_INDEX_MIN, pokemonPath } from "@/lib/pokemon-hubs";
import { REGION_LIST, regionOrNotFound, type Market } from "@/lib/regions";
import { itemListJsonLd, jsonLd, pageMeta, regionAlternates } from "@/lib/seo";
import { storesInMarket } from "@/lib/stores";

// Pokémon hubs (lib/pokemon-hubs.ts, DECISIONS.md 2026-11-08): the sealed products whose own name names one Pokémon.
// Rendered per request and kept by Vercel's CDN for a day (next.config.js, CDN_PAGES), never ISR, like every hub page.
export const dynamic = "force-dynamic";

const getData = cache((market: Market, slug: string) => pokemonPageData(market, POKEMON_BY_SLUG.get(slug)!));
const getCounts = cache((market: Market) => pokemonCounts(market));

export async function generateMetadata({ params }: { params: { region: string; name: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const hub = POKEMON_BY_SLUG.get(params.name);
  if (!hub) return {};
  const d = await getData(r.market, hub.slug);
  if (!d.open.length && !d.sold.length) notFound();
  const from = d.open[0]?.lowestPriceCents ?? null;
  const title = hubTitle(
    from != null ? `${hub.name} Pokémon TCG boxes & collections in ${r.inName} — from ${money(from, r.market)}` : `${hub.name} Pokémon TCG boxes & collections in ${r.inName}`,
  );
  const indexed = detailIndexed(r.region) && d.comparable >= POKEMON_INDEX_MIN;
  return {
    ...pageMeta({
      title: titleText(title),
      description: `Every sealed ${hub.name} product we compare in ${r.inName}: collections, tins, boxes and premium sets, ${d.openCount ? `${d.openCount} in stock today, cheapest first` : "none in stock today"}, prices in ${r.currency} across ${r.adjective} stores.`,
      path: pokemonPath(r.region, hub.slug),
      alternates: indexed ? regionAlternates(r.region, `/pokemon/${hub.slug}`, REGION_LIST.filter((x) => detailIndexed(x.region))) : undefined,
      noindex: !indexed,
    }),
    title,
  };
}

export default async function PokemonPage({ params }: { params: { region: string; name: string } }) {
  const r = regionOrNotFound(params.region);
  const hub = POKEMON_BY_SLUG.get(params.name);
  if (!hub) notFound();
  const [{ open, sold, openCount, soldCount }, counts] = await Promise.all([getData(r.market, hub.slug), getCounts(r.market)]);
  if (!open.length && !sold.length) notFound();
  const more = openCount > open.length;
  // Today's numbers in words, and the questions they answer (lib/hub-summary.ts, as the type and set hubs since 2026-11-10): these
  // hubs were the thinnest pages in the sitemap (2026-11-14: a median of 171 characters of prose on 146 listed pages). Built only
  // from the rows this page loaded; a hub with little data says less.
  const summary = hubSummary({
    r,
    subject: `${hub.name} sealed products`,
    products: [...open, ...sold],
    complete: !more && soldCount <= sold.length,
    openTotal: openCount,
    soldTotal: soldCount,
    storeCount: storesInMarket(r.market).length,
    tcgplayer: r.market === "US",
  });
  const others = POKEMON.filter((p) => p.slug !== hub.slug && (counts.get(p.slug) ?? 0) >= POKEMON_INDEX_MIN)
    .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))
    .slice(0, 24);
  const path = pokemonPath(r.region, hub.slug);
  const ld = itemListJsonLd({ name: `${hub.name} Pokémon TCG products in ${r.inName}`, path, items: [...open, ...sold].map((p) => ({ path: `/${r.region}/p/${p.slug}`, name: p.name })) });
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { href: `/${r.region}/pokemon`, label: "By Pokémon" }, { label: hub.name }]} />
      <h1 className="ph-h1">
        {hub.name} Pokémon TCG products in {r.inName}
      </h1>
      <p className="ph-lede">
        Every sealed product whose name features {hub.name}: collections, tins, premium boxes and blisters, compared across {r.adjective} stores
        {r.market === "US" ? " and TCGplayer" : ""}. <b className="text-ink">{openCount}</b> in stock{open[0]?.lowestPriceCents != null && <> from {money(open[0].lowestPriceCents, r.market)}</>}, cheapest first.
      </p>
      {others.length > 0 && (
        <nav aria-label="Other Pokémon" className="mt-5">
          <ul className="scroller -mx-4 gap-2 px-4 scroll-px-4 sm:mx-0 sm:px-0">
            {others.map((x) => (
              <li key={x.slug}>
                <Link href={pokemonPath(r.region, x.slug)} prefetch={false} className="chip min-h-10 whitespace-nowrap">
                  {x.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <StockFilter
        soldCount={sold.length}
        soldLabel="sold out everywhere"
        soldOut={
          sold.length > 0 ? (
            <Section title="Sold out everywhere" kicker="Listed, but nobody has them right now">
              <ProductGrid products={sold} region={r.region} />
            </Section>
          ) : null
        }
      >
        <Section id="in-stock" title="In stock now" kicker={more ? `Cheapest first · ${open.length} of ${openCount}` : "Cheapest first"}>
          {open.length ? (
            <ProductGrid products={open} region={r.region} eager={4} />
          ) : (
            <Empty actions={[{ href: `/${r.region}/sealed?stock=in`, label: "Everything in stock" }]}>No {hub.name} product is in stock in {r.inName} right now.</Empty>
          )}
          {more && <p className="mt-4 text-sm text-muted">The {open.length} cheapest of {plural(openCount, "product")} in stock.</p>}
        </Section>
      </StockFilter>
      {/* Under the products, as on a type page (the minimal look, 2026-11-13): in the HTML either way, one line until opened. */}
      {summary.paragraphs.length > 0 && (
        <Folds label={`About ${hub.name} products`}>
          <Fold id="today-h" title={`${hub.name} sealed products in ${r.inName} today`}>
            <HubSummaryText title={`${hub.name} sealed products in ${r.inName} today`} paragraphs={summary.paragraphs} />
          </Fold>
        </Folds>
      )}
      <HubFaqSection faq={summary.faq} />
      <p className="mt-8">
        <Link href={`/${r.region}/pokemon`} prefetch={false} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
          Every Pokémon <Icon name="arrow-right" size={16} />
        </Link>
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}
