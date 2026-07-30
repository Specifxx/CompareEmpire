import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getFeaturedRestock,
  getFeaturedRestockSlugs,
  isHeadlineType,
  rrpFor,
} from "@/lib/restocks";
import { recentRestockEvents } from "@/lib/restock-recheck";
import { RestockAlertForm } from "@/components/RestockAlertForm";
import { OutboundLink } from "@/components/OutboundLink";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { aggregateOffer } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { RETAILER_LIST } from "@/lib/retailers";
import { formatMoney, timeAgo } from "@/lib/format";

// Per-request: stock + the visitor's market come from the country cookie.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getFeaturedRestockSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getFeaturedRestock(params.slug);
  if (!p) notFound(); // real 404 — metadata resolves before streaming
  const title = `${p.shortName} restock tracker — in stock now? (AU/US/UK)`;
  const description = `Is ${p.name} back in stock? Live stock across the stores we track, a restock log, and a free email alert the moment a Booster Box or ETB restocks.`;
  return {
    title,
    description,
    alternates: { canonical: `/restock/${p.slug}` },
    openGraph: { type: "website", title, description },
  };
}

// Display order for product-type groups (headline SKUs first).
const TYPE_ORDER = ["Booster Box", "Booster Case", "Elite Trainer Box", "Collection Box", "Bundle"];
const typeRank = (t: string) => {
  const i = TYPE_ORDER.indexOf(t);
  return i === -1 ? 999 : i;
};

export default async function RestockTrackerPage({ params }: { params: { slug: string } }) {
  const product = getFeaturedRestock(params.slug);
  if (!product) notFound();

  const country = getCountry();
  const info = COUNTRIES[country];

  // This route is force-dynamic, so this query runs on EVERY request (and the
  // sitemap advertises these pages as hourly). It reads ONLY this product's rows
  // via the precomputed SealedListing.productSlug + @@index([productSlug, country])
  // — it used to pull the whole market's sealed table (~1 MB/request of Neon
  // transfer) and narrow it to these same rows with a regex in JS.
  const [all, events, waiting] = await Promise.all([
    prisma.sealedListing.findMany({
      where: { country, productSlug: product.slug },
      select: { id: true, title: true, productType: true, retailer: true, retailerName: true, priceCents: true, url: true, inStock: true, lastSeen: true },
      orderBy: { priceCents: "asc" },
    }),
    recentRestockEvents(product.slug, country, 12),
    prisma.restockAlert.count({ where: { productSlug: product.slug, market: country } }),
  ]);

  const stores = all.filter((r) => !r.retailer.startsWith("ebay"));
  const ebayRows = all.filter((r) => r.retailer.startsWith("ebay"));

  // STATUS is driven only by HEADLINE SKUs (a $9 pack doesn't make it "in stock").
  const headlineInStock = stores.filter((r) => r.inStock && isHeadlineType(r.productType));
  const isLive = headlineInStock.length > 0;

  // Group store rows by product type (headline types first), in-stock first within.
  const byType = new Map<string, typeof stores>();
  for (const r of stores) {
    const arr = byType.get(r.productType) ?? [];
    arr.push(r);
    byType.set(r.productType, arr);
  }
  const groups = [...byType.entries()]
    .map(([type, rows]) => ({
      type,
      rows: rows.slice().sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.priceCents - b.priceCents),
    }))
    .sort((a, b) => typeRank(a.type) - typeRank(b.type) || a.type.localeCompare(b.type));

  // ── Premium meter (real data): cheapest store vs eBay secondary vs RRP. ──
  const cheapestStoreCents = headlineInStock.length ? Math.min(...headlineInStock.map((r) => r.priceCents)) : null;
  const ebayFloorCents = ebayRows.filter((r) => r.inStock).reduce<number | null>((m, r) => (m == null || r.priceCents < m ? r.priceCents : m), null);
  // RRP only when we hold a CONFIRMED number for this market (we never invent one).
  const headlineType = groups.find((g) => isHeadlineType(g.type))?.type ?? "Booster Box";
  const rrpCents = rrpFor(product, country, headlineType);
  const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

  const ebayHref = ebaySearchUrl(product.ebayQuery, country);
  const lastChecked = all.reduce<Date | null>((latest, r) => (!latest || r.lastSeen > latest ? r.lastSeen : latest), null);
  const coverageCount = RETAILER_LIST.filter((s) => (s.country ?? "AU") === country).length;

  // One valid AggregateOffer from every retail listing price (in stock or last
  // seen); eBay secondary rows are excluded so the snippet reflects buy-it-new
  // prices. Omitted when we hold no retail price — see lib/structured-data.
  const offers = aggregateOffer({
    priceCentsList: stores.map((r) => r.priceCents),
    inStock: isLive,
    currency: info.currency,
  });
  // A Product without offers (and with no reviews here) is a Search Console
  // critical error — emit the node only when we hold a real price.
  const jsonLd = !offers ? null : {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    category: "Trading Card Game Sealed Product",
    description: product.blurb,
    offers,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Restock trackers", item: `${SITE_URL}/restock` },
      { "@type": "ListItem", position: 3, name: `${product.shortName} restock tracker`, item: `${SITE_URL}/restock/${product.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ? [jsonLd, breadcrumb] : [breadcrumb]) }} />
      <Link href="/restock" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All restock trackers
      </Link>

      {/* Hero + status */}
      <div className="card-surface overflow-hidden">
        <div className="relative border-l-2 border-brand-500 bg-ink-850 px-6 py-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-ink-950/60 text-slate-300">{product.series}</span>
            <span className={`chip font-semibold ${isLive ? "bg-brand-500/20 text-brand-300" : "bg-rose-500/15 text-rose-300"}`}>
              {isLive ? `● Box/ETB in stock now in ${country}` : `● Sold out in ${country}`}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{product.shortName} restock tracker</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{product.blurb}</p>
          <p className="mt-2 text-xs text-slate-500">
            Watching <strong className="text-slate-300">{coverageCount} {info.adjective} stores</strong> — the specialist TCG
            shops the camping crowd ignores{lastChecked ? ` · stock checked ${timeAgo(lastChecked)}` : ""}.
          </p>
        </div>
      </div>

      {/* Premium meter — store vs secondary vs RRP, from live data only. */}
      {(cheapestStoreCents != null || ebayFloorCents != null) && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rrpCents != null && (
            <Metric label={`RRP (${headlineType})`} value={formatMoney(rrpCents, info.currency)} />
          )}
          {cheapestStoreCents != null && (
            <Metric
              label="Cheapest store"
              value={formatMoney(cheapestStoreCents, info.currency)}
              sub={rrpCents != null ? `${pct(cheapestStoreCents, rrpCents) >= 0 ? "+" : ""}${pct(cheapestStoreCents, rrpCents)}% vs RRP` : "in stock now"}
              good
            />
          )}
          {ebayFloorCents != null && (
            <Metric
              label="eBay (secondary)"
              value={formatMoney(ebayFloorCents, info.currency)}
              sub={cheapestStoreCents != null ? `+${pct(ebayFloorCents, cheapestStoreCents)}% vs store` : rrpCents != null ? `+${pct(ebayFloorCents, rrpCents)}% vs RRP` : "secondary market"}
            />
          )}
        </div>
      )}

      {/* Email capture — the conversion. Always shown, with social proof. */}
      <div className="mt-4">
        <RestockAlertForm productSlug={product.slug} shortName={product.shortName} waiting={waiting} />
      </div>

      {/* Chase-single hook — only when the set's singles are in our catalogue. */}
      {product.setCode && (
        <Link href={`/browse?set=${product.setCode}&sort=price_desc`} className="mt-4 block rounded-lg border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-ink-600">
          <div className="text-sm font-semibold text-white">Only want the chase cards, not a whole box?</div>
          <p className="mt-0.5 text-xs text-slate-400">
            Buying the {product.shortName} singles you actually want is almost always cheaper than a gouged sealed box —
            compare every {product.shortName} card across stores →
          </p>
        </Link>
      )}

      {/* Restock log — proof it works + how fast stock vanishes. */}
      {events.length > 0 && (
        <section className="card-surface mt-4 overflow-hidden">
          <div className="border-b border-ink-700 p-4">
            <h2 className="font-bold text-white">Restock log</h2>
            <p className="mt-0.5 text-xs text-slate-500">Every time a Box/ETB came back in stock — and how fast it sold out.</p>
          </div>
          <ul className="divide-y divide-ink-800">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 p-3 text-sm">
                <span className="text-xs text-slate-500">{timeAgo(e.inStockAt)}</span>
                <span className="flex-1 truncate text-slate-200">
                  <strong className="text-white">{e.retailerName}</strong> · {e.productType} · <span className="num">{formatMoney(e.priceCents, info.currency)}</span>
                </span>
                <span className={`chip shrink-0 ${e.soldOutAt ? "bg-ink-800 text-slate-400" : "bg-brand-500/15 text-brand-300"}`}>
                  {e.soldOutAt ? `sold out in ${e.durationMins ?? "?"} min` : "in stock"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Live board, grouped by product type */}
      <section className="card-surface mt-4 overflow-hidden">
        <div className="border-b border-ink-700 p-4">
          <h2 className="font-bold text-white">Live stock by product</h2>
        </div>
        {groups.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <p className="font-semibold text-white">No {info.adjective} store we track is listing this yet.</p>
            <p className="mt-1">Set an alert above, or grab one on eBay&apos;s secondary market now:</p>
            <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="btn-primary mt-3 inline-flex">
              Search {product.shortName} on eBay →
            </OutboundLink>
          </div>
        ) : (
          <div className="divide-y divide-ink-800">
            {groups.map((g) => {
              const liveCount = g.rows.filter((r) => r.inStock).length;
              return (
                <div key={g.type} className="p-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <h3 className="text-sm font-bold text-white">
                      {g.type} {isHeadlineType(g.type) && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-gold">chase SKU</span>}
                    </h3>
                    <span className={`chip ${liveCount ? "bg-brand-500/15 text-brand-300" : "bg-ink-800 text-slate-500"}`}>
                      {liveCount ? `${liveCount} in stock` : "sold out"}
                    </span>
                  </div>
                  <ul className="divide-y divide-ink-800">
                    {g.rows.map((r) => (
                      <li
                        key={r.id}
                        className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2.5 sm:flex-nowrap ${r.inStock ? "" : "opacity-55"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{r.retailerName}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                            {r.inStock ? <span className="text-brand-400">● In stock</span> : <span>● Out of stock</span>}
                            <span>· seen {timeAgo(r.lastSeen)}</span>
                          </div>
                        </div>
                        <div className={`num shrink-0 text-right text-sm font-bold ${r.inStock ? "text-accent" : "text-slate-400 line-through"}`}>
                          {formatMoney(r.priceCents, info.currency)}
                        </div>
                        <OutboundLink
                          href={affiliateUrl(r.url)}
                          retailer={r.retailer}
                          country={country}
                          kind="sealed"
                          className={`order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto ${r.inStock ? "btn-primary" : "btn-ghost"}`}
                        >
                          {r.inStock ? "Buy →" : "Check →"}
                        </OutboundLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        {/* Secondary market always available */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 bg-ink-900/40 px-4 py-3 text-xs text-slate-400">
          <span>Can&apos;t wait? eBay almost always has it (at a premium).</span>
          <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="shrink-0 font-semibold text-brand-400 hover:underline">
            Search eBay →
          </OutboundLink>
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] text-slate-600">
        Stock is collected from public store listings and refreshes every ~15 minutes for tracked products — always
        confirm on the retailer&apos;s site. DexCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}

function Metric({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num text-lg font-bold ${good ? "text-accent" : "text-white"}`}>{value}</div>
      {sub && <div className="num text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
