import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSealedGroups, synthesizeSealedGroup, type SealedGroup } from "@/lib/sealed-import";
import { FEATURED_RESTOCKS, restockTitleRegex, type FeaturedRestock } from "@/lib/restocks";
import { recentRestockEvents } from "@/lib/restock-recheck";
import { RestockAlertForm } from "@/components/RestockAlertForm";
import { SealedTile } from "@/components/SealedTile";
import { OutboundLink } from "@/components/OutboundLink";
import { AdSlot } from "@/components/AdSlot";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { EbayAd } from "@/components/EbayAd";
import { affiliateUrl, ebaySearchUrl } from "@/lib/affiliate";
import { aggregateOffer } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
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

const PREORDER_RE = /pre[\s-]?order/i;

// Scraped titles carry store-specific preorder noise ("(Pre-Order)", "- PREORDER
// Ships Sept 16") that (a) bloats the <title> past Google's ~60-char truncation
// point, burying the "compare prices" hook the SERP snippet needs to earn a
// click, and (b) reads as messy copy. Strip it into one clean "Preorder" signal
// we control the wording of — the exact intent buyers are already searching for.
function cleanSealedName(raw: string): string {
  const cleaned = raw
    .replace(/\(\s*pre[\s-]?order[^)]*\)?/gi, "")
    .replace(/[-|]\s*pre[\s-]?order.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || raw.trim();
}

// Truncate at a word boundary so the title never ends mid-word — Google elides
// with "…" itself, we don't need to add one.
function truncateAtWord(name: string, max: number): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const country = getCountry();
  const g =
    (await findAny(params.slug, country)) ??
    (await findAny(params.slug, "AU")) ??
    synthesizeSealedGroup(params.slug);
  if (!g) notFound(); // real 404 — metadata resolves before streaming
  const isPreorder = PREORDER_RE.test(g.name);
  const cleanName = cleanSealedName(g.name);
  const displayName = truncateAtWord(cleanName, isPreorder ? 34 : 43);
  const title = isPreorder ? `${displayName} Preorder — Compare Prices` : `${displayName} — Compare Prices`;
  const description = isPreorder
    ? `${displayName} preorder — compare live prices across AU, NZ, US & UK stores before it sells out.`
    : `${displayName} price comparison across AU, NZ, US & UK stores — find the cheapest place to buy.`;
  return {
    title,
    description,
    alternates: { canonical: `/sealed/${g.slug}` },
    // A synthesized product (no live listing anywhere) is a real page, not a 404,
    // but it has no offers — noindex it so we don't feed Google a thin/soft-404
    // page. It flips back to indexable automatically once a store lists it again.
    ...(g.listings.length === 0 ? { robots: { index: false, follow: true } } : {}),
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
  // Known product that no store currently lists → rebuild it from its slug so the
  // page renders (200) with the "no stores listing / set an alert" state instead
  // of 404-ing a URL Google has already indexed. Unknown slugs still 404.
  if (!group) {
    group = synthesizeSealedGroup(params.slug) ?? undefined;
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
  const hasEbay = listings.some((l) => l.retailer === "ebay");
  const lastSeen = listings.reduce<Date | null>((latest, l) => (!latest || l.lastSeen > latest ? l.lastSeen : latest), null);

  // One valid AggregateOffer from every known listing price (in stock or last
  // seen). Omitted entirely when we hold no price, rather than emitting an
  // invalid offerCount:0 node — see lib/structured-data.
  const offers = aggregateOffer({
    priceCentsList: listings.map((l) => l.priceCents),
    inStock: inStock.length > 0,
    currency: priceInfo.currency,
  });
  // A Product without offers (and with no reviews here) is a Search Console
  // critical error — emit the node only when we hold a real price.
  const jsonLd = !offers ? null : {
    "@context": "https://schema.org",
    "@type": "Product",
    name: group.name,
    category: "Trading Card Game Sealed Product",
    ...(group.imageUrl ? { image: group.imageUrl } : {}),
    offers,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sealed products", item: `${SITE_URL}/sealed` },
      { "@type": "ListItem", position: 3, name: group.name, item: `${SITE_URL}/sealed/${group.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ? [jsonLd, breadcrumb] : [breadcrumb]) }} />
      <Link href="/sealed" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All sealed products
      </Link>

      {/* Hero */}
      <div className="card-surface overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="grid aspect-square w-full shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-800 bg-ink-900 p-4 sm:w-48">
            {group.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.imageUrl} alt={group.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm font-bold text-slate-600">{group.productType}</span>
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
                  <div className="num text-3xl font-extrabold text-accent">{formatMoney(lowest, priceInfo.currency)}</div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
                  <div className="text-2xl font-extrabold text-down">Sold out in {priceInfo.code}</div>
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
            {/* eBay as a store row at the top when it isn't already listed — gives
                every sealed page a second source (and drives the eBay affiliate). */}
            {!hasEbay && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">
                    eBay{country === "NZ" ? " AU" : ""}{" "}
                    <span className="font-normal text-slate-500">(price not available)</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <span>Marketplace · search live listings</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-bold text-slate-500">—</div>
                <OutboundLink
                  href={ebayHref}
                  retailer="ebay_search"
                  country={country}
                  kind="sealed"
                  className="btn-primary order-last w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto"
                >
                  Search eBay →
                </OutboundLink>
              </li>
            )}
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
                <div className={`num shrink-0 text-right text-sm font-bold ${l.inStock ? "text-accent" : "text-slate-400 line-through"}`}>
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
        {hasEbay && (
          <div className="flex items-center justify-end border-t border-ink-800 px-4 py-2.5 text-xs">
            <OutboundLink href={ebayHref} retailer="ebay_search" country={country} kind="sealed" className="font-semibold text-brand-400 hover:underline">
              Search eBay{country === "NZ" ? " AU" : ""} for more listings →
            </OutboundLink>
          </div>
        )}
      </section>

      {/* Affiliate banners — both live partners on this high-AOV sealed page.
          eBay searches for THIS product (sealed boxes have a big used market). */}
      <TcgplayerAd size="leaderboard" country={country} className="mt-6" />
      <EbayAd size="leaderboard" country={country} query={group.name} className="mt-3" />

      <AdSlot height={120} className="mt-6" />

      {/* Chase-single hook — buying the singles you want often beats a full box. */}
      {setMeta && (
        <Link
          href={`/browse?set=${group.setCode}&sort=price_desc`}
          className="mt-4 block rounded-lg border border-ink-700 bg-ink-900/60 p-4 transition-colors hover:border-ink-600"
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
                  <strong className="text-white">{e.retailerName}</strong> · {e.productType} · <span className="num">{formatMoney(e.priceCents, priceInfo.currency)}</span>
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
        retailer&apos;s site. DexCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}
