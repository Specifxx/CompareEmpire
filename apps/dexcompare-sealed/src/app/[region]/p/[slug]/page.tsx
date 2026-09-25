import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OfferTable } from "@/components/OfferTable";
import { ProductGrid } from "@/components/ProductCard";
import { Section } from "@/components/Section";
import { StockPill } from "@/components/StockPill";
import { ebayLabel, ebaySearchUrl, REL_SPONSORED, REL_STORE } from "@/lib/affiliate";
import { productPage, relatedProducts } from "@/lib/data";
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

export async function generateMetadata({ params }: { params: { region: Region; slug: string } }): Promise<Metadata> {
  const r = REGIONS[params.region];
  if (!r) return {};
  const p = await getPage(params.slug, params.region);
  if (!p) return {};
  const open = p.offers.filter((o) => offerStock(o) === "open");
  const cheapest = open[0];
  const desc = cheapest
    ? `${p.name}: in stock at ${plural(open.length, `${r.adjective} store`)}, from ${money(cheapest.priceCents, r.market)}. Compare every store's price and stock.`
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
  const related = p.setCode ? await relatedProducts(r.market, p.setCode, p.slug) : [];
  const elsewhere = REGION_LIST.filter((x) => x.region !== r.region)
    .map((x) => ({ x, s: p.stats.find((s) => s.market === x.market) }))
    .filter((e) => e.s && e.s.listedStores > 0);

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
        <div className="card relative flex aspect-square items-center justify-center overflow-hidden bg-raised lg:sticky lg:top-24">
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

          <div className="card mt-6 p-5">
            {best ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-muted">{pre ? "Cheapest pre-order" : "Best price in stock"}</div>
                    <div className="tabular font-display text-4xl font-extrabold tracking-tight">{money(best.priceCents, r.market)}</div>
                    <div className="mt-1 text-sm text-muted">at {best.storeName}</div>
                  </div>
                  <a href={best.url} target="_blank" rel={REL_STORE} className="btn-primary px-6 py-3 text-base">
                    Go to {best.storeName} <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
                  <StockPill state="open" preorder={pre}>
                    {pre ? "Pre-order" : "In stock"} at {open.length} of {plural(p.offers.length, "store")}
                  </StockPill>
                  {open.length > 1 && (
                    <span>
                      up to {money(open[open.length - 1].priceCents, r.market)} — you save {money(open[open.length - 1].priceCents - best.priceCents, r.market)} by
                      buying at the cheapest
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <StockPill state="soldout">Sold out</StockPill>
                  <span className="text-sm text-muted">
                    {p.offers.length
                      ? `at all ${plural(p.offers.length, `${r.adjective} store`)} that list it`
                      : `No ${r.adjective} store we track lists this yet`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {r.ebayHost && (
            <a
              href={ebaySearchUrl(p.name, r.region)}
              target="_blank"
              rel={REL_SPONSORED}
              className="card mt-3 flex items-center justify-between gap-3 px-5 py-4 text-sm transition-shadow hover:shadow-lift"
            >
              <span>
                <b>Also check eBay</b> <span className="text-muted">— Buy It Now listings on {ebayLabel(r.region)}</span>
              </span>
              <span className="shrink-0 font-semibold text-brand">Search eBay ↗</span>
            </a>
          )}
          <p className="mt-2 text-xs text-faint">eBay link is an affiliate link. Store prices exclude shipping; check the store before you buy.</p>
        </div>
      </div>

      <Section title={p.offers.length ? `Prices at ${plural(p.offers.length, "store")} in ${r.name}` : `Not listed in ${r.name} yet`}>
        {p.offers.length ? (
          <OfferTable offers={p.offers} market={r.market} preorder={pre} />
        ) : (
          <div className="card px-6 py-8 text-muted">
            None of the {r.adjective} stores we track list {p.name} right now.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-faint">
          Prices are each store&rsquo;s own, in {r.currency}, read from their public product listings about twice a day. &ldquo;Not checked
          recently&rdquo; means we couldn&rsquo;t read that store for over three days, so its stock is unknown.
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
                  {s!.inStockStores > 0 ? `from ${money(s!.lowestPriceCents, x.market)}` : "sold out"}
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
