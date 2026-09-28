import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MarketplacePanel, SoldOutCallout } from "@/components/Marketplaces";
import { OfferTable } from "@/components/OfferTable";
import { OutboundLink } from "@/components/OutboundLink";
import { ProductGrid } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { StockPill } from "@/components/StockPill";
import { offerLink, offerRetailer } from "@/lib/affiliate";
import { productPage, relatedProducts, type OfferView } from "@/lib/data";
import { money, plural } from "@/lib/format";
import { thumb } from "@/lib/images";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { REGION_LIST, REGIONS, type Region } from "@/lib/regions";
import { offerStock } from "@/lib/sealed-offers";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { jsonLd, pageMeta, regionAlternates } from "@/lib/seo";
import { SET_BY_CODE } from "@/lib/sets";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

// Rendered on first visit, then cached until the next import (see
// src/app/[region]/layout.tsx for why nothing is prerendered at build).
export function generateStaticParams() {
  return [];
}

const getPage = cache((slug: string, region: Region) => productPage(slug, REGIONS[region].market));

// "N stores" never counts a marketplace. In the US, TCGplayer is one of the
// offers (ranked like a store) and is named beside the count instead.
function openWhere(open: OfferView[], noun: string): string {
  const n = open.filter((o) => !o.marketplace).length;
  const tcg = open.some((o) => o.marketplace);
  if (!n) return "on TCGplayer";
  return `at ${plural(n, noun)}${tcg ? " and on TCGplayer" : ""}`;
}

export async function generateMetadata({ params }: { params: { region: Region; slug: string } }): Promise<Metadata> {
  const r = REGIONS[params.region];
  if (!r) return {};
  const p = await getPage(params.slug, params.region);
  if (!p) return {};
  const open = p.offers.filter((o) => offerStock(o) === "open");
  const cheapest = open[0];
  const desc = cheapest
    ? `${p.name}: in stock ${openWhere(open, `${r.adjective} store`)}, from ${money(cheapest.priceCents, r.market)}. Compare every store's price and stock.`
    : `${p.name}: compare price and stock across ${r.adjective} stores.`;
  return pageMeta({
    title: `${p.name} — price & stock in ${r.name}`,
    description: desc,
    path: `/${r.region}/p/${p.slug}`,
    alternates: regionAlternates(r.region, `/p/${p.slug}`),
    image: p.imageUrl,
    // Thin pages stay reachable but out of the index: nothing to compare (one
    // store, sold out) or nothing listed in this region at all.
    noindex: open.length === 0 && p.offers.length < 2,
  });
}

export default async function ProductPage({ params }: { params: { region: Region; slug: string } }) {
  const r = REGIONS[params.region];
  const p = await getPage(params.slug, params.region);
  if (!p) notFound();

  const set = p.setCode ? SET_BY_CODE.get(p.setCode) : null;
  const type = TYPE_BY_LABEL.get(p.productType);
  const pre = isPreorderSet(p.setCode);
  const now = Date.now();
  const open = p.offers.filter((o) => offerStock(o, now) === "open");
  const best = open[0] ?? null;
  const bestLink = best ? offerLink(best.store, best.url, r.region, "product-best") : null;
  const stores = p.offers.filter((o) => !o.marketplace);
  const openStores = open.filter((o) => !o.marketplace).length;
  const tcgOpen = open.some((o) => o.marketplace);
  const tableTitle = !p.offers.length
    ? `Not listed in ${r.name} yet`
    : stores.length
      ? `Prices at ${plural(stores.length, "store")}${stores.length < p.offers.length ? " + TCGplayer" : ""} in ${r.name}`
      : `Prices on TCGplayer in ${r.name}`;
  // TCGplayer: in the US one of the offers; elsewhere the separate US$ offer.
  const tcgplayer = p.offers.find((o) => o.marketplace) ?? p.usMarketplace;
  const related = p.setCode ? await relatedProducts(r.market, p.setCode, p.slug) : [];
  const elsewhere = REGION_LIST.filter((x) => x.region !== r.region)
    .map((x) => ({ x, s: p.stats.find((s) => s.market === x.market) }))
    .filter((e) => !!e.s); // a stat row exists only where a store or TCGplayer lists it

  const ld = open.length
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        ...(p.imageUrl ? { image: p.imageUrl } : {}),
        brand: { "@type": "Brand", name: "Pokémon" },
        category: `Pokémon TCG ${p.productType}`,
        url: `${SITE_URL}/${r.region}/p/${p.slug}`,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: r.currency,
          lowPrice: (open[0].priceCents / 100).toFixed(2),
          highPrice: (open[open.length - 1].priceCents / 100).toFixed(2),
          offerCount: open.length,
          availability: pre ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
        },
      }
    : null;

  return (
    <div className="page py-8">
      <Breadcrumbs
        items={[
          { href: `/${r.region}`, label: r.name },
          ...(type ? [{ href: `/${r.region}/type/${type.slug}`, label: type.plural }] : []),
          ...(set ? [{ href: `/${r.region}/sets/${set.slug}`, label: set.name }] : []),
          { label: p.name },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-raised sm:aspect-square lg:sticky lg:top-24">
          {p.imageUrl ? (
            <img src={thumb(p.imageUrl, 900)!} alt={p.name} className="absolute inset-0 h-full w-full object-contain p-8" />
          ) : (
            <span className="font-display text-2xl font-bold text-faint">{p.productType}</span>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-raised px-2.5 py-1 font-semibold text-muted">{p.productType}</span>
            {set && (
              <Link href={`/${r.region}/sets/${set.slug}`} className="rounded-full bg-raised px-2.5 py-1 font-semibold text-muted hover:text-ink">
                {set.series} · {set.name}
              </Link>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
          {set && (
            <p className="mt-2 text-sm text-muted">
              {pre ? "Releases" : "Released"} {formatRelease(set.releaseDate)}
              {pre && " — open offers below are pre-orders"}
            </p>
          )}

          {best && bestLink ? (
            <>
              <div className="card mt-6 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-muted">{pre ? "Cheapest pre-order" : "Best price in stock"}</div>
                    <div className="tabular font-display text-4xl font-extrabold tracking-tight">{money(best.priceCents, r.market)}</div>
                    <div className="mt-1 text-sm text-muted">
                      {best.marketplace ? "on" : "at"} {best.storeName}
                      {bestLink.sponsored && <span> · marketplace · affiliate link</span>}
                    </div>
                  </div>
                  <OutboundLink
                    href={bestLink.href}
                    rel={bestLink.rel}
                    retailer={offerRetailer(best.store, best.storeName, r.market)}
                    placement="product-best"
                    className="btn-primary px-6 py-3 text-base"
                  >
                    {best.marketplace ? `Buy on ${best.storeName}` : `Go to ${best.storeName}`} <span aria-hidden="true">↗</span>
                  </OutboundLink>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
                  <StockPill state="open" preorder={pre}>
                    {pre ? "Pre-order" : "In stock"}{" "}
                    {openStores ? `at ${openStores} of ${plural(stores.length, "store")}${tcgOpen ? " + TCGplayer" : ""}` : "on TCGplayer"}
                  </StockPill>
                  {!openStores && stores.length > 0 && <span>no {r.adjective} store we track has it in stock</span>}
                  {open.length > 1 && (
                    <span>
                      up to {money(open[open.length - 1].priceCents, r.market)} — you save {money(open[open.length - 1].priceCents - best.priceCents, r.market)} by
                      buying at the cheapest
                    </span>
                  )}
                </div>
              </div>
              <MarketplacePanel region={r.region} productName={p.name} preorder={pre} tcgplayer={tcgplayer} tcgplayerIsBest={best.marketplace} />
            </>
          ) : (
            <SoldOutCallout
              region={r.region}
              productName={p.name}
              storesListing={stores.length}
              notChecked={stores.filter((o) => offerStock(o, now) === "unknown").length}
              tcgplayer={tcgplayer}
            />
          )}
          <p className="mt-2 text-xs text-faint">
            {p.offers.some((o) => o.marketplace)
              ? "Prices exclude shipping. TCGplayer’s is one seller’s listing when we last checked; check it, or the store, before you buy."
              : "Store prices exclude shipping; check the store before you buy."}
          </p>
        </div>
      </div>

      <Section title={tableTitle}>
        {p.offers.length ? (
          <OfferTable offers={p.offers} region={r.region} preorder={pre} productName={p.name} usTcgplayer={p.usMarketplace} />
        ) : (
          <div className="card px-6 py-8 text-muted">
            None of the {r.adjective} stores we track list {p.name} right now.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-faint">
          Prices are each store&rsquo;s own, in {r.currency}, read from their public product listings about twice a day. &ldquo;Not checked
          recently&rdquo; means we couldn&rsquo;t read that store for over three days, so its stock is unknown.
          {p.offers.some((o) => o.marketplace) &&
            " TCGplayer is a marketplace of many sellers; it ranks by price and stock like any store, and its link is an affiliate link."}
        </p>
      </Section>

      {elsewhere.length > 0 && (
        <Section title="In other regions">
          <div className="flex flex-wrap gap-2">
            {elsewhere.map(({ x, s }) => (
              <Link key={x.region} href={`/${x.region}/p/${p.slug}`} className="chip py-2">
                <span aria-hidden="true">{x.flag}</span>
                <span>{x.name}</span>
                <span className="tabular text-muted">
                  {s!.inStockStores > 0 || s!.marketplaceOpen ? `from ${money(s!.lowestPriceCents, x.market)}` : "sold out"}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && set && (
        <Section title={`More from ${set.name}`} href={`/${r.region}/sets/${set.slug}`} linkLabel="Whole set">
          <ProductGrid products={related} region={r.region} />
        </Section>
      )}

      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
    </div>
  );
}
