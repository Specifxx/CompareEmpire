import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayBanner, NoFooterLink, NoPreFooter } from "@/components/Ebay";
import { ListingsStrip } from "@/components/ListingsStrip";
import { ebayQuery, MarketplacePanel, SoldOutCallout } from "@/components/Marketplaces";
import { OfferTable } from "@/components/OfferTable";
import { OutboundLink } from "@/components/OutboundLink";
import { ProductGrid } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { StockPill } from "@/components/StockPill";
import { ebayLabel, offerLink, offerRetailer } from "@/lib/affiliate";
import { productContext } from "@/lib/ebay-context-parse";
import { productAdPlan, quickSearches } from "@/lib/ebay-ads";
import { ebayListingsEnabled } from "@/lib/ebay-listings";
import { comparable, productPage, relatedProducts, type OfferView } from "@/lib/data";
import { medianSaving, money, pctOf, plural } from "@/lib/format";
import { thumb } from "@/lib/images";
import { packsFor, perPackCents } from "@/lib/packs";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { regionOrNotFound, REGION_LIST, type Market, type RegionInfo } from "@/lib/regions";
import { RRP_NOTE, usMsrpCents } from "@/lib/rrp";
import { offerStock } from "@/lib/sealed-offers";
import { TYPE_BY_LABEL } from "@/lib/sealed-title";
import { jsonLd, pageMeta, productJsonLd, regionAlternates } from "@/lib/seo";
import { SET_BY_CODE } from "@/lib/sets";

export const revalidate = 86400;

// Rendered on first visit, then cached until the next import (see
// src/app/[region]/layout.tsx for why nothing is prerendered at build).
export function generateStaticParams() {
  return [];
}

const getPage = cache((slug: string, market: Market) => productPage(slug, market));

/**
 * The product in this region, or a 404: unknown slug, or a product nothing in
 * this region lists (no ProductStat row and no offers). The old thin "Not
 * listed here yet" page is gone; the region chips on a real page still lead
 * to wherever it is listed. The stats are already fetched, so this costs nothing.
 */
async function load(slug: string, r: RegionInfo) {
  const p = await getPage(slug, r.market);
  if (!p) notFound();
  const here = p.stats.find((s) => s.market === r.market) ?? null;
  if (!here && !p.offers.length) notFound();
  return { p, here };
}

// "N stores" never counts a marketplace. In the US, TCGplayer is one of the
// offers (ranked like a store) and is named beside the count instead.
function openWhere(open: OfferView[], noun: string): string {
  const n = open.filter((o) => !o.marketplace).length;
  const tcg = open.some((o) => o.marketplace);
  if (!n) return "on TCGplayer";
  return `at ${plural(n, noun)}${tcg ? " and on TCGplayer" : ""}`;
}

export async function generateMetadata({ params }: { params: { region: string; slug: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const { p } = await load(params.slug, r);
  const open = p.offers.filter((o) => offerStock(o) === "open");
  const cheapest = open[0];
  const desc = cheapest
    ? `${p.name}: in stock ${openWhere(open, `${r.adjective} store`)}, from ${money(cheapest.priceCents, r.market)}. Compare every store's price and stock.`
    : `${p.name}: compare price and stock across ${r.adjective} stores.`;
  // Thin pages stay reachable but out of the index: nothing to compare (one
  // store, sold out). A noindex page carries no hreflang set either, and the
  // set only names the regional copies that are themselves indexable.
  const noindex = open.length === 0 && p.offers.length < 2;
  const path = `/${r.region}/p/${p.slug}`;
  const indexable = REGION_LIST.filter((x) => {
    if (x.region === r.region) return !noindex;
    const s = p.stats.find((st) => st.market === x.market);
    return !!s && comparable(s);
  });
  const image = thumb(p.imageUrl, 1200);
  const meta = pageMeta({
    title: `${p.name} — price & stock in ${r.name}`,
    description: desc,
    path,
    alternates: noindex ? undefined : regionAlternates(r.region, `/p/${p.slug}`, indexable),
    image,
    noindex,
  });
  // The product's own tags through `other` (Next's openGraph union has no
  // product type): og:type and the price a crawler can quote. Next 14 writes
  // `other` as <meta name=…>, not property=, so the standard og:type=website
  // stays as well. Shopify's CDN scales to the width asked for and keeps the
  // aspect ratio, so only the width is known; TCGplayer's renditions are square.
  const square = image?.includes("tcgplayer-cdn.tcgplayer.com");
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      ...(image ? { images: [{ url: image, width: 1200, ...(square ? { height: 1200 } : {}), alt: p.name }] } : {}),
    },
    other: {
      "og:type": "product",
      ...(cheapest ? { "product:price:amount": (cheapest.priceCents / 100).toFixed(2), "product:price:currency": r.currency } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: { region: string; slug: string } }) {
  const r = regionOrNotFound(params.region);
  const { p, here } = await load(params.slug, r);

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

  // eBay units on this page (components/Ebay.tsx, Marketplaces.tsx): the panel (or,
  // sold out, the callout) carries the product's set x type searches; the table's
  // closing group and the footer banner appear only where the page is long enough
  // to keep them a screen apart (productAdPlan).
  const quick = quickSearches(set?.name, type?.key);
  const ads = productAdPlan({ offerRows: p.offers.length, elsewhere: elsewhere.length, related: set ? related.length : 0 });
  // With eBay's API keys, the product's set's chase cards appear as real listings: directly below the offer
  // table (it replaces the "Still deciding?" group) where the table is long enough to sit a screen below the
  // marketplace panel; otherwise at the bottom of the page, in place of the generic strip above the footer,
  // where the page has room for a unit there (productAdPlan). Without keys nothing changes.
  const listingsOn = ebayListingsEnabled();
  const stripAt = listingsOn ? (ads.tableGroup ? "table" : ads.preFooter ? "bottom" : null) : null;
  const strip = stripAt && (
    <ListingsStrip
      region={r.region}
      context={productContext(p.setCode)}
      variant="section"
      placement="listings-product"
      className="mt-6"
      fallback={
        <EbayBanner
          region={r.region}
          variant={stripAt === "table" ? "section" : "footer"}
          placement={stripAt === "table" ? "product-after-table" : "pre-footer"}
          title={stripAt === "table" ? "Still deciding? Search this product on eBay" : "Shop Pokémon sealed on eBay"}
          text={`Search Buy It Now listings on ${ebayLabel(r.region)}.`}
          query={stripAt === "table" ? ebayQuery(p.name, tcgplayer) : ""}
        />
      }
    />
  );

  // Price signals beside the best price, each a fact about the current
  // listings: per pack (when the product line fixes a pack count), the median
  // of the in-stock stores (from ProductStat, null under two stores), and in
  // the US TPCi's published MSRP. Nothing here is history.
  const packs = type ? packsFor(type.key, p.setCode, p.name) : null;
  const perPack = best ? perPackCents(best.priceCents, packs) : null;
  const median = here?.medianOpenCents ?? null;
  const medianStores = here?.inStockStores ?? 0;
  const saving = best ? medianSaving(best.priceCents, median, medianStores) : null;
  const msrp = r.market === "US" && type ? usMsrpCents(type.key, p.setCode) : null;
  const vsMsrp = best && msrp ? pctOf(best.priceCents, msrp) : null;

  const ld = open.length
    ? productJsonLd({
        name: p.name,
        path: `/${r.region}/p/${p.slug}`,
        image: p.imageUrl,
        productType: p.productType,
        setName: set?.name,
        currency: r.currency,
        lowCents: open[0].priceCents,
        highCents: open[open.length - 1].priceCents,
        offerCount: open.length,
        preorder: pre,
      })
    : null;

  return (
    <div className="page py-8">
      {!ads.preFooter && <NoPreFooter />}
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
            <img
              src={thumb(p.imageUrl, 900)!}
              alt={p.name}
              width={900}
              height={900}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain p-8"
            />
          ) : (
            <span className="font-display text-2xl font-bold text-faint">{p.productType}</span>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-raised px-2.5 py-1 font-semibold text-muted">{p.productType}</span>
            {set && (
              <Link href={`/${r.region}/sets/${set.slug}`} prefetch={false} className="rounded-full bg-raised px-2.5 py-1 font-semibold text-muted hover:text-ink">
                {set.series} · {set.name}
              </Link>
            )}
            {packs != null && <span className="rounded-full bg-raised px-2.5 py-1 font-semibold text-muted">{plural(packs, "booster pack")}</span>}
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
                    {perPack != null && <div className="tabular mt-0.5 text-sm text-muted">≈ {money(perPack, r.market)} per pack</div>}
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
                {(saving || (msrp != null && vsMsrp != null && vsMsrp < 0)) && (
                  <p className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-open">
                    {saving && <span>{saving}</span>}
                    {msrp != null && vsMsrp != null && vsMsrp < 0 && <span className="rounded-full border border-open/40 px-2">{-vsMsrp}% below US MSRP</span>}
                  </p>
                )}
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
                {(median != null || msrp != null) && (
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
                    {median != null && (
                      <div>
                        <dt className="inline">Median in-stock price </dt>
                        <dd className="tabular inline font-semibold text-ink">
                          {money(median, r.market)} <span className="font-normal text-muted">across {plural(medianStores, "store")}</span>
                        </dd>
                      </div>
                    )}
                    {msrp != null && (
                      <div>
                        <dt className="inline">US MSRP </dt>
                        <dd className="tabular inline font-semibold text-ink">
                          {money(msrp, r.market)}
                          {vsMsrp != null && vsMsrp !== 0 && (
                            <span className="font-normal text-muted">
                              {" "}
                              · best price {Math.abs(vsMsrp)}% {vsMsrp < 0 ? "below" : "above"} MSRP
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
              <MarketplacePanel
                region={r.region}
                productName={p.name}
                preorder={pre}
                tcgplayer={tcgplayer}
                tcgplayerIsBest={best.marketplace}
                ebayPrimary={openStores <= 1}
                quick={quick}
              />
            </>
          ) : (
            <>
              <SoldOutCallout
                region={r.region}
                productName={p.name}
                storesListing={stores.length}
                notChecked={stores.filter((o) => offerStock(o, now) === "unknown").length}
                tcgplayer={tcgplayer}
                quick={quick}
              />
              {msrp != null && (
                <p className="mt-2 text-sm text-muted">
                  US MSRP <b className="tabular text-ink">{money(msrp, r.market)}</b>
                </p>
              )}
            </>
          )}
          <p className="mt-2 text-xs text-muted">
            {p.offers.some((o) => o.marketplace)
              ? "Prices exclude shipping. TCGplayer’s is one seller’s listing when we last checked; check it, or the store, before you buy."
              : "Store prices exclude shipping; check the store before you buy."}
            {packs != null && " Per-pack prices are the listed price divided by the packs the product holds."}
            {msrp != null && ` ${RRP_NOTE}`}
          </p>
        </div>
      </div>

      <Section title={tableTitle}>
        {p.offers.length ? (
          <OfferTable offers={p.offers} region={r.region} preorder={pre} productName={p.name} usTcgplayer={p.usMarketplace} packs={packs} marketGroup={ads.tableGroup && !listingsOn} />
        ) : (
          <div className="card px-6 py-8 text-muted">
            None of the {r.adjective} stores we track list {p.name} right now.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-muted">
          Prices are each store&rsquo;s own, in {r.currency}, read from their public product listings about twice a day. &ldquo;Not checked
          recently&rdquo; means we couldn&rsquo;t read that store for over three days, so its stock is unknown.
          {p.offers.some((o) => o.marketplace) &&
            " TCGplayer is a marketplace of many sellers; it ranks by price and stock like any store, and its link is an affiliate link."}
        </p>
      </Section>

      {stripAt === "table" && strip}

      {elsewhere.length > 0 && (
        <Section title="In other regions">
          <div className="flex flex-wrap gap-2">
            {elsewhere.map(({ x, s }) => (
              <Link key={x.region} href={`/${x.region}/p/${p.slug}`} prefetch={false} className="chip py-2">
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

      {stripAt === "bottom" && (
        <>
          <NoPreFooter />
          <NoFooterLink />
          {strip}
        </>
      )}

      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
    </div>
  );
}
