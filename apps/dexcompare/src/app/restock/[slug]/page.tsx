import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFeaturedRestock, getFeaturedRestockSlugs, restockTitleRegex } from "@/lib/restocks";
import { RestockAlertForm } from "@/components/RestockAlertForm";
import { OutboundLink } from "@/components/OutboundLink";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { formatMoney, timeAgo } from "@/lib/format";

// Per-request: stock + the visitor's market come from the country cookie.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getFeaturedRestockSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getFeaturedRestock(params.slug);
  if (!p) return { title: "Restock tracker not found" };
  const title = `${p.shortName} restock tracker — in stock now? (AU/NZ/US/UK)`;
  const description = `Is ${p.name} back in stock? Live stock across the stores we track, plus a free email alert the moment it restocks. ${p.blurb}`;
  return {
    title,
    description,
    alternates: { canonical: `/restock/${p.slug}` },
    openGraph: { type: "website", title, description },
  };
}

export default async function RestockTrackerPage({ params }: { params: { slug: string } }) {
  const product = getFeaturedRestock(params.slug);
  if (!product) notFound();

  const country = getCountry();
  const info = COUNTRIES[country];
  const re = restockTitleRegex(product);

  // All sealed listings we hold for the visitor's market, matched to this product.
  const all = (
    await prisma.sealedListing.findMany({
      where: { country },
      select: { id: true, title: true, productType: true, retailer: true, retailerName: true, priceCents: true, url: true, inStock: true, lastSeen: true },
      orderBy: { priceCents: "asc" },
    })
  ).filter((r) => re.test(r.title));

  const inStock = all.filter((r) => r.inStock);
  const outOfStock = all.filter((r) => !r.inStock);
  const isLive = inStock.length > 0;
  const ebayHref = ebaySearchUrl(product.ebayQuery, country);
  const lastChecked = all.reduce<Date | null>((latest, r) => (!latest || r.lastSeen > latest ? r.lastSeen : latest), null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    category: "Trading Card Game Sealed Product",
    description: product.blurb,
    ...(inStock.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: info.currency,
            lowPrice: (Math.min(...inStock.map((r) => r.priceCents)) / 100).toFixed(2),
            availability: "https://schema.org/InStock",
            offerCount: inStock.length,
          },
        }
      : { offers: { "@type": "AggregateOffer", priceCurrency: info.currency, availability: "https://schema.org/OutOfStock", offerCount: 0 } }),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/restock" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All restock trackers
      </Link>

      <div className="card-surface overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-ink-950/60 text-slate-300">{product.series}</span>
            <span
              className={`chip font-semibold ${isLive ? "bg-brand-500/20 text-brand-300" : "bg-rose-500/15 text-rose-300"}`}
            >
              {isLive ? `● In stock now in ${country}` : `● Sold out in ${country}`}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{product.shortName} restock tracker</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{product.blurb}</p>
          {lastChecked && (
            <p className="mt-2 text-xs text-slate-500">Stock last checked {timeAgo(lastChecked)} · {info.adjective} stores</p>
          )}
        </div>
      </div>

      {/* Email capture — the conversion. Always shown. */}
      <div className="mt-4">
        <RestockAlertForm productSlug={product.slug} shortName={product.shortName} />
      </div>

      {/* Live in-stock board */}
      <section className="card-surface mt-4 overflow-hidden">
        <div className="border-b border-ink-700 p-4">
          <h2 className="font-bold text-white">
            In stock right now <span className="text-slate-500">({inStock.length})</span>
          </h2>
        </div>
        {inStock.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <p className="font-semibold text-white">Sold out across every {info.adjective} store we track.</p>
            <p className="mt-1">
              We&apos;ll email you the second that changes. In the meantime, there&apos;s almost always
              secondary-market stock on eBay (at a markup):
            </p>
            <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="btn-primary mt-3 inline-flex">
              Search {product.shortName} on eBay{country === "NZ" ? " AU" : ""} →
            </OutboundLink>
          </div>
        ) : (
          <ul className="divide-y divide-ink-800">
            {inStock.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 p-4 hover:bg-ink-900/50">
                <div className="w-6 text-center text-sm font-bold text-slate-500">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{r.retailerName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="chip bg-ink-800 text-slate-300">{r.productType}</span>
                    <span className="text-brand-400">● In stock</span>
                  </div>
                </div>
                <div className="text-right text-lg font-bold text-accent">{formatMoney(r.priceCents, info.currency)}</div>
                <OutboundLink href={affiliateUrl(r.url)} retailer={r.retailer} country={country} kind="sealed" className="btn-primary">
                  Buy →
                </OutboundLink>
              </li>
            ))}
          </ul>
        )}
        {/* Secondary market always available */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 bg-ink-900/40 px-4 py-3 text-xs text-slate-400">
          <span>Can&apos;t wait? Check eBay&apos;s secondary market (usually in stock, at a premium).</span>
          <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="shrink-0 font-semibold text-brand-400 hover:underline">
            Search eBay{country === "NZ" ? " AU" : ""} →
          </OutboundLink>
        </div>
      </section>

      {/* Out of stock (last seen) */}
      {outOfStock.length > 0 && (
        <section className="card-surface mt-4 overflow-hidden">
          <div className="bg-ink-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Out of stock ({outOfStock.length}) · last listed price
          </div>
          <ul className="divide-y divide-ink-800">
            {outOfStock.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4 opacity-60">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-300">{r.retailerName}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <span className="chip bg-ink-800 text-slate-400">{r.productType}</span>
                  </div>
                </div>
                <div className="text-right text-lg font-bold text-slate-400 line-through">{formatMoney(r.priceCents, info.currency)}</div>
                <OutboundLink href={affiliateUrl(r.url)} retailer={r.retailer} country={country} kind="sealed" className="btn-ghost">
                  Check →
                </OutboundLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-600">
        Stock is collected from public store listings and refreshes regularly — always confirm on the
        retailer&apos;s site. DexCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}
