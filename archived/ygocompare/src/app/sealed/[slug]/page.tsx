import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSealedGroups, type SealedGroup } from "@/lib/sealed-import";
import { FEATURED_RESTOCKS, restockTitleRegex, type FeaturedRestock } from "@/lib/restocks";
import { recentRestockEvents } from "@/lib/restock-recheck";
import { RestockAlertForm } from "@/components/RestockAlertForm";
import { SealedTile } from "@/components/SealedTile";
import { SealedArt } from "@/components/SealedArt";
import { OutboundLink } from "@/components/OutboundLink";
import { AdSlot } from "@/components/AdSlot";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { EbayAd } from "@/components/EbayAd";
import { ADSENSE_SLOTS } from "@/lib/ads";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import { formatMoney, timeAgo } from "@/lib/format";

// Per-request: prices + stock + market come from the country cookie.
export const dynamic = "force-dynamic";

// Find the group across markets just for metadata (AU is the catalogue baseline).
async function findAny(slug: string, country: string): Promise<SealedGroup | null> {
  const groups = await getSealedGroups(country);
  return groups.find((g) => g.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const country = getCountry();
  const g = (await findAny(params.slug, country)) ?? (await findAny(params.slug, "AU"));
  if (!g) notFound(); // real 404 — metadata resolves before streaming
  const title = `${g.name} — compare prices`;
  const description = `Compare live prices for ${g.name} across the stores we track in Australia, New Zealand, the US and the UK, and find the cheapest place to buy this sealed Yu-Gi-Oh! product.`;
  return {
    title,
    description,
    alternates: { canonical: `/sealed/${g.slug}` },
    openGraph: { type: "website", title, description, ...(g.imageUrl ? { images: [g.imageUrl] } : {}) },
  };
}

// The featured restock (if any) this product belongs to — unlocks the email alert
// + restock log demand-capture on the compare page.
function matchFeatured(name: string): FeaturedRestock | null {
  return FEATURED_RESTOCKS.find((p) => restockTitleRegex(p).test(name)) ?? null;
}

export default async function SealedComparePage({ params }: { params: { slug: string } }) {
  const country = getCountry();
  const info = COUNTRIES[country];

  // Page EXISTENCE must not depend on the visitor's market: the sitemap lists
  // the AU catalogue, and Googlebot crawls from US IPs — a US-market-only
  // lookup made every AU-only product a soft-404 with noindex for the crawler
  // (512 sitemap URLs flagged by the indexability audit). Fall back to the AU
  // grouping so the page always renders when the product exists anywhere; the
  // fallback's prices are then HONESTLY presented in AUD, not relabelled.
  const groups = await getSealedGroups(country);
  let group = groups.find((g) => g.slug === params.slug);
  let priceInfo = info;
  if (!group && country !== "AU") {
    group = (await getSealedGroups("AU")).find((g) => g.slug === params.slug);
    if (group) priceInfo = COUNTRIES.AU;
  }
  if (!group) notFound();

  const featured = matchFeatured(group.name);
  const setMeta = group.setCode ? POKEMON_SETS.find((s) => s.code === group.setCode) ?? null : null;

  // Related sealed products from the same set (other types), boxes/ETBs first.
  const related = group.setCode
    ? groups.filter((g) => g.setCode === group.setCode && g.slug !== group.slug).slice(0, 10)
    : [];

  // Featured-restock extras (alert form + log) — only when the product is one we
  // re-check every ~15 minutes, so the "we'll email you" promise is real.
  const [events, waiting] = featured
    ? await Promise.all([
        recentRestockEvents(featured.slug, country, 8),
        prisma.restockAlert.count({ where: { productSlug: featured.slug, market: country } }),
      ])
    : [[], 0];

  const listings = group.listings;
  const inStock = listings.filter((l) => l.inStock);
  const lowest = group.lowestPriceCents;
  const ebayHref = ebaySearchUrl(group.name, country);
  const lastSeen = listings.reduce<Date | null>((latest, l) => (!latest || l.lastSeen > latest ? l.lastSeen : latest), null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: group.name,
    category: "Trading Card Game Sealed Product",
    ...(group.imageUrl ? { image: group.imageUrl } : {}),
    ...(inStock.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: priceInfo.currency,
            lowPrice: ((lowest as number) / 100).toFixed(2),
            highPrice: (Math.max(...listings.map((l) => l.priceCents)) / 100).toFixed(2),
            availability: "https://schema.org/InStock",
            offerCount: inStock.length,
            // Prices refresh daily — valid until tomorrow keeps the markup honest.
            priceValidUntil: new Date(Date.now() + 86400e3).toISOString().slice(0, 10),
          },
        }
      : { offers: { "@type": "AggregateOffer", priceCurrency: priceInfo.currency, availability: "https://schema.org/OutOfStock", offerCount: 0 } }),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/sealed" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All sealed products
      </Link>

      {/* Hero */}
      <div className="card-surface overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="grid aspect-square w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-850 to-ink-900 p-4 sm:w-48">
            {group.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.imageUrl} alt={group.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <SealedArt setCode={group.setCode} productType={group.productType} className="h-full w-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-brand-500/15 text-brand-300">{group.productType}</span>
              {setMeta && (
                <Link href={`/sets/${setMeta.slug}`} className="chip bg-ink-800 text-slate-300 hover:text-white">
                  {setMeta.name}
                </Link>
              )}
            </div>
            <h1 className="mt-2 text-xl font-extrabold leading-tight text-white sm:text-2xl">{group.name}</h1>
            <div className="mt-3 flex items-end gap-3">
              {lowest != null ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Cheapest in {priceInfo.code}</div>
                  <div className="text-3xl font-extrabold text-accent">{formatMoney(lowest, priceInfo.currency)}</div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
                  <div className="text-2xl font-extrabold text-rose-300">Sold out in {priceInfo.code}</div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {group.totalCount} {group.totalCount === 1 ? "store" : "stores"} tracked
              {group.storeCount > 0 ? ` · ${group.storeCount} in stock` : ""}
              {lastSeen ? ` · updated ${timeAgo(lastSeen)}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Featured restock — email capture (only when re-checked every ~15 min). */}
      {featured && (
        <div className="mt-4">
          <RestockAlertForm productSlug={featured.slug} shortName={featured.shortName} waiting={waiting} />
        </div>
      )}

      {/* Price comparison board */}
      <section className="card-surface mt-4 overflow-hidden">
        <div className="border-b border-ink-700 p-4">
          <h2 className="font-bold text-white">Price comparison</h2>
          <p className="mt-0.5 text-xs text-slate-500">Every store we track, cheapest in-stock first.</p>
        </div>
        {listings.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <p className="font-semibold text-white">No {priceInfo.adjective} store is listing this right now.</p>
            <p className="mt-1">Try eBay&apos;s secondary market:</p>
            <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="btn-primary mt-3 inline-flex">
              Search on eBay{country === "NZ" ? " AU" : ""} →
            </OutboundLink>
          </div>
        ) : (
          <ul className="divide-y divide-ink-800">
            {listings.map((l, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-4 ${l.inStock ? "" : "opacity-55"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{l.retailerName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    {l.inStock ? <span className="text-brand-400">● In stock</span> : <span>● Out of stock</span>}
                    <span>· seen {timeAgo(l.lastSeen)}</span>
                  </div>
                </div>
                <div className={`shrink-0 text-right text-sm font-bold ${l.inStock ? "text-accent" : "text-slate-400 line-through"}`}>
                  {formatMoney(l.priceCents, priceInfo.currency)}
                </div>
                <OutboundLink
                  href={affiliateUrl(l.url, l.retailer)}
                  retailer={l.retailer}
                  country={country}
                  kind="sealed"
                  className={`order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto ${l.inStock ? "btn-primary" : "btn-ghost"}`}
                >
                  {l.inStock ? "Buy →" : "Check →"}
                </OutboundLink>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 bg-ink-900/40 px-4 py-3 text-xs text-slate-400">
          <span>Want the secondary market too?</span>
          <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="shrink-0 font-semibold text-brand-400 hover:underline">
            Search eBay{country === "NZ" ? " AU" : ""} →
          </OutboundLink>
        </div>
      </section>

      {/* Affiliate banners — both live partners on this high-AOV sealed page.
          eBay searches for THIS product (sealed boxes have a big used market). */}
      <TcgplayerAd size="leaderboard" country={country} className="mt-6" />
      <EbayAd size="leaderboard" country={country} query={group.name} className="mt-3" />

      <AdSlot slot={ADSENSE_SLOTS.card} height={120} className="mt-6" />

      {/* Chase-single hook — buying the singles you want often beats a full box. */}
      {setMeta && (
        <Link
          href={`/browse?set=${group.setCode}&sort=price_desc`}
          className="mt-4 block rounded-xl border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-brand-500/50"
        >
          <div className="text-sm font-semibold text-white">Only want the chase cards, not a whole box?</div>
          <p className="mt-0.5 text-xs text-slate-400">
            Compare every {setMeta.name} single across stores — buying the cards you actually want is
            often cheaper than a sealed box →
          </p>
        </Link>
      )}

      {/* Restock log (featured only) */}
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
                  <strong className="text-white">{e.retailerName}</strong> · {e.productType} · {formatMoney(e.priceCents, priceInfo.currency)}
                </span>
                <span className={`chip shrink-0 ${e.soldOutAt ? "bg-ink-800 text-slate-400" : "bg-brand-500/15 text-brand-300"}`}>
                  {e.soldOutAt ? `sold out in ${e.durationMins ?? "?"} min` : "in stock"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related sealed from the same set */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-extrabold text-white">
            More {setMeta?.name ?? "sealed"} products
          </h2>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {related.map((g) => (
              <div key={g.slug} className="w-40 shrink-0 sm:w-44">
                <SealedTile group={g} currency={priceInfo.currency} />
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-600">
        Prices are collected from public store listings and refreshed daily — always confirm on the
        retailer&apos;s site. YGOCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}
