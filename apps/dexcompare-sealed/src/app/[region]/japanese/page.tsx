import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { AmazonLink } from "@/components/AmazonLink";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayStrip } from "@/components/EbayStrip";
import { Icon } from "@/components/Icon";
import { OutboundLink } from "@/components/OutboundLink";
import { ProductGrid } from "@/components/ProductGrid";
import { Empty, Section } from "@/components/Section";
import { AFFILIATE_NOTE_SHORT, REL_SPONSORED, TCGPLAYER_RETAILER, tcgplayerSearchUrl } from "@/lib/affiliate";
import { AMAZON_ASSOCIATE_STATEMENT, amazonFor, amazonUrl } from "@/lib/amazon";
import { cardOpen } from "@/lib/compact";
import { japaneseProducts, lastCheckedAt, type ProductCardData } from "@/lib/data";
import { money, plural, timeAgo } from "@/lib/format";
import { hubTitle, shortDate, titleText } from "@/lib/hub-copy";
import { regionOrNotFound, type Market } from "@/lib/regions";
import { JAPANESE_TYPES } from "@/lib/sealed-title";
import { pageMeta } from "@/lib/seo";
import { displayCode, JA_SETS, jaSetCode, type JapaneseSet } from "@/lib/sets-ja";

// The Japanese section: Japanese booster boxes and packs (sealed-title.ts identifyJapanese), grouped by set, newest set first.
// Rendered per request and kept by Vercel's CDN for a day (next.config.js, CDN_PAGES), never ISR, like every hub page.
export const dynamic = "force-dynamic";

const getData = cache((market: Market) => japaneseProducts(market));

/** The market's Japanese products by set, in JA_SETS order (newest first), each set's in-stock products first. */
function bySet(products: ProductCardData[]): { set: JapaneseSet; products: ProductCardData[] }[] {
  const of = new Map<string, ProductCardData[]>();
  for (const p of products) if (p.setCode) (of.get(p.setCode) ?? of.set(p.setCode, []).get(p.setCode)!).push(p);
  return JA_SETS.filter((s) => of.has(jaSetCode(s))).map((set) => ({ set, products: of.get(jaSetCode(set))! }));
}

export async function generateMetadata({ params }: { params: { region: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const products = await getData(r.market);
  const open = products.filter(cardOpen);
  const from = open.length ? Math.min(...open.map((p) => p.lowestPriceCents ?? Infinity)) : null;
  const title = hubTitle(
    open.length && from != null && Number.isFinite(from)
      ? `Japanese Pokémon booster boxes in ${r.inName} — from ${money(from, r.market)}, ${open.length} in stock`
      : `Japanese Pokémon booster boxes in ${r.inName} — prices & stock`,
  );
  return {
    ...pageMeta({
      title: titleText(title),
      description: `Japanese Pokémon TCG booster boxes and packs compared across ${r.adjective} stores${r.market === "US" ? " and TCGplayer" : ""}: ${
        open.length ? `${open.length} in stock today, cheapest first` : "none in stock today"
      }, ${plural(bySet(products).length, "Japanese set")} listed. Prices in ${r.currency}.`,
      path: `/${r.region}/japanese`,
      // A region with nothing Japanese listed has an empty page: kept out of the index (and the sitemap) until a store lists one.
      noindex: products.length === 0,
    }),
    title,
  };
}

export default async function JapanesePage({ params }: { params: { region: string } }) {
  const r = regionOrNotFound(params.region);
  const [products, checked] = await Promise.all([getData(r.market), lastCheckedAt(r.market)]);
  const groups = bySet(products);
  const open = products.filter(cardOpen);
  const from = open.length ? open.reduce((m, p) => Math.min(m, p.lowestPriceCents ?? m), Infinity) : null;
  const us = r.market === "US";
  const amazon = amazonFor(r.region);
  // The Japanese box feed's listings (ebay-import.ts TYPE_FEEDS; cascade: generic sealed), on a row of its own after the newest set.
  const strip = (
    <EbayStrip
      region={r.region}
      context="type:japanese-booster-boxes"
      placement="listings-japanese"
      headings={{ type: "Japanese booster boxes on eBay", sealed: "Sealed Pokémon on eBay" }}
      search={{ kind: "sealed", query: "Japanese Booster Box", label: "Search Japanese booster boxes on eBay" }}
    />
  );
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "Japanese" }]} />
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Japanese Pokémon booster boxes in {r.inName}</h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">
        Japanese booster boxes and packs, compared across the {r.adjective} stores that sell them{us ? " and on TCGplayer" : ""}, in {r.currency}. Every
        price is the store&rsquo;s own, for the Japanese edition only: an English box never shares a price with a Japanese one. Japanese boxes hold
        fewer, smaller packs than English ones, and the count differs by set, so this page shows no price per pack.
      </p>
      <p className="mt-2 text-sm text-muted">
        <b className="text-ink">{open.length}</b> in stock
        {from != null && Number.isFinite(from) && <> from {money(from, r.market)}</>} · {plural(products.length, "product")} across{" "}
        {plural(groups.length, "set")}
        {checked && (
          <>
            {" "}
            · prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />
          </>
        )}
      </p>

      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {JAPANESE_TYPES.map((t) => (
          <li key={t.slug}>
            <Link href={`/${r.region}/type/${t.slug}`} prefetch={false} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
              All {t.plural} <Icon name="arrow-right" size={16} />
            </Link>
          </li>
        ))}
        {/* TCGplayer's Japanese product line (lib/affiliate.ts tcgplayerSearchUrl): US only, as on a set page. */}
        {us && (
          <li className="flex flex-wrap items-center gap-x-2">
            <OutboundLink
              href={tcgplayerSearchUrl("Japanese Booster Box", r.region, "japanese-tcgplayer")}
              rel={REL_SPONSORED}
              retailer={TCGPLAYER_RETAILER}
              placement="japanese-tcgplayer"
              className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-strong hover:underline"
            >
              Shop Japanese Pokémon on TCGplayer <span aria-hidden="true">↗</span>
            </OutboundLink>
            <span className="text-xs text-muted">{AFFILIATE_NOTE_SHORT}</span>
          </li>
        )}
        {amazon && (
          <li className="flex flex-wrap items-center gap-x-2">
            <AmazonLink region={r.region} href={amazonUrl(r.region, { name: "Pokemon Japanese Booster Box" }, "amazon-japanese")!} product="japanese" placement="amazon-japanese" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
              Check Japanese boxes on {amazon.label} <span aria-hidden="true">↗</span>
            </AmazonLink>
            <span className="text-xs text-muted">{AMAZON_ASSOCIATE_STATEMENT}</span>
          </li>
        )}
      </ul>

      {groups.length > 0 && (
        <nav aria-label="Japanese sets" className="mt-4">
          <ul className="scroller -mx-4 gap-2 px-4 scroll-px-4 sm:mx-0 sm:px-0">
            {groups.map(({ set, products: ps }) => (
              <li key={set.code}>
                <a href={`#${set.code}`} className="chip min-h-10 whitespace-nowrap">
                  {displayCode(set)} {set.name}
                  <span className="text-xs text-muted">{ps.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.length === 0 ? (
        <Section title="Nothing listed yet">
          <Empty actions={[{ href: `/${r.region}/sealed?stock=in`, label: "Everything in stock" }]}>
            No {r.adjective} store we track lists a Japanese booster box or pack right now.
          </Empty>
          <div className="mt-4">{strip}</div>
        </Section>
      ) : (
        groups.map(({ set, products: ps }, i) => {
          const inStock = ps.filter(cardOpen).length;
          return (
            <section key={set.code} id={set.code} aria-labelledby={`h-${set.code}`} className="mt-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <div className="eyebrow mb-1">
                    {set.era} · {displayCode(set)}
                    {set.releaseDate && <> · released in Japan {shortDate(set.releaseDate)}</>}
                  </div>
                  <h2 id={`h-${set.code}`} className="font-display text-2xl font-bold tracking-tight">
                    {set.name}
                  </h2>
                </div>
                <p className="text-sm text-muted">
                  {plural(ps.length, "product")} · {inStock} in stock
                </p>
              </div>
              <ProductGrid products={ps} region={r.region} eager={i === 0 ? 4 : 0} strip={i === 0 ? strip : undefined} />
            </section>
          );
        })
      )}

      <p className="mt-10 max-w-2xl text-sm text-muted">
        A listing is filed here only when the store&rsquo;s title says it is Japanese and names the set, by its code or its English name. Korean,
        Chinese and other Asian editions share many set names and codes, and are left out rather than guessed. Set codes and release dates
        are Japan&rsquo;s.
      </p>
    </div>
  );
}
