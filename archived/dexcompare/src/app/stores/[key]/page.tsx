import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { RETAILERS, shippingPolicyUrl, retailerCountry } from "@/lib/retailers";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { storeStats } from "@/lib/store-stats";
import { parsePageSize } from "@/lib/cards";
import { SITE_URL } from "@/lib/site";
import { StoreListings, StoreListingsView } from "./StoreListings";

export const revalidate = 86400;

// Fixed prewarm head — the busiest stores only. Everything else is generated on
// first request and then ISR-cached (dynamicParams defaults to true).
const PREWARM_STORES = 8;

// THE cache fix for this route (with the searchParams removal below): without
// `generateStaticParams` Next 14 never registers a dynamic route for ISR, so
// `revalidate` above was a silent no-op — this path appeared in neither `routes`
// nor `dynamicRoutes` in .next/prerender-manifest.json and every request re-ran
// storeStats() (a 4k-row read) against Postgres. Mirrors card/[id].
//
// Derived from the DB (stores with the most tracked in-stock listings) rather
// than the static RETAILERS map on purpose: it prewarms the stores that matter,
// AND a build with an unreachable database prerenders nothing instead of failing
// inside a page whose queries throw — the catch returns [] and every store page
// is then generated on demand.
export async function generateStaticParams() {
  try {
    const busiest = await prisma.retailerPrice.groupBy({
      by: ["retailer"],
      where: { inStock: true, NOT: { retailer: { startsWith: "marketguide" } } },
      _count: { retailer: true },
      orderBy: { _count: { retailer: "desc" } },
      take: PREWARM_STORES,
    });
    return busiest.filter((g) => RETAILERS[g.retailer]).map((g) => ({ key: g.retailer }));
  } catch {
    return [];
  }
}

// NOTE: no `searchParams` here or in the page below. Reading it is a dynamic API
// in Next 14 and silently voids `revalidate` for the whole route. Pagination now
// lives in the <StoreListings> client island.
export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const store = RETAILERS[params.key];
  if (!store) notFound();
  const title = `${store.name} — Pokémon Card Prices & Store Profile`;
  const description = `Is ${store.name} cheaper? See how many Pokémon cards ${store.name} currently has at the lowest tracked price, its shipping policy, and every in-stock listing DexCompare compares.`;
  return {
    title,
    description,
    // Page 1 is the only server-rendered (and only indexable) view; the canonical
    // points here from every ?page=/?size= permutation, and the island adds
    // noindex,follow client-side on those — preserving the old rule that only
    // page 1 competes in the index (same rule as /browse).
    alternates: { canonical: `/stores/${params.key}` },
    openGraph: { title, description, url: `${SITE_URL}/stores/${params.key}` },
  };
}

export default async function StorePage({ params }: { params: { key: string } }) {
  const store = RETAILERS[params.key];
  if (!store) notFound();

  const country = retailerCountry(params.key);
  const fmt = (cents: number) => formatMoney(cents, COUNTRIES[country].currency);
  const stats = await storeStats(params.key, country);

  // Default view only (page 1, default page size) — searchParams-free, so this
  // render is cacheable. Other pages are fetched client-side.
  const size = parsePageSize(undefined);
  const pageRows = stats.rows.slice(0, size);
  const policyUrl = shippingPolicyUrl(params.key);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE_URL}/stores` },
      { "@type": "ListItem", position: 3, name: store.name, item: `${SITE_URL}/stores/${params.key}` },
    ],
  };
  const org = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: store.base,
  };

  return (
    <div className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, org]) }} />

      <div>
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <span>/</span>
          <Link href="/stores" className="hover:text-slate-300">Stores</Link>
          <span>/</span>
          <span className="text-slate-300">{store.name}</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{store.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          {store.name} is one of the {COUNTRIES[country].label} Pokémon TCG stores DexCompare compares.{" "}
          {stats.cheapestCount > 0 ? (
            <>
              Right now it has the <strong className="text-slate-200">lowest tracked price</strong> on{" "}
              <strong className="text-slate-200">{stats.cheapestCount}</strong> of the {stats.totalInStock} cards we track from
              them.
            </>
          ) : (
            <>DexCompare tracks {stats.totalInStock} in-stock listings from {store.name}.</>
          )}{" "}
          <a href={store.base} target="_blank" rel="nofollow noopener noreferrer" className="text-brand-400 hover:underline">
            Visit {store.name} ↗
          </a>
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Market" value={`${COUNTRIES[country].flag} ${COUNTRIES[country].label}`} />
        <Stat label="Listings tracked" value={String(stats.totalInStock)} />
        <Stat label="Cheapest on" value={`${stats.cheapestCount} cards`} />
        <Stat label="Shipping" value={store.shippingNote} small />
      </div>

      {/* Biggest current saving */}
      {stats.biggestSaving && (
        <div className="card-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Biggest current saving</div>
          <p className="mt-1 text-sm text-slate-300">
            <Link href={`/card/${stats.biggestSaving.cardSlug}`} className="font-semibold text-white hover:underline">
              {stats.biggestSaving.cardName}
            </Link>{" "}
            is <span className="num font-semibold text-up">{fmt(stats.biggestSaving.savingCents)} under</span> its TCGplayer
            market guide price at {store.name} — {fmt(stats.biggestSaving.priceCents)} vs a {fmt(stats.biggestSaving.guideCents)} guide.
          </p>
        </div>
      )}

      {/* Shipping policy summary */}
      <div className="card-surface p-4">
        <h2 className="font-bold text-white">Shipping</h2>
        <p className="mt-1 text-sm text-slate-400">{store.shippingNote}</p>
        {policyUrl && (
          <a href={policyUrl} target="_blank" rel="nofollow noopener noreferrer" className="mt-2 inline-block text-sm text-brand-400 hover:underline">
            Read {store.name}&apos;s full shipping policy ↗
          </a>
        )}
      </div>

      {/* In-stock listings. useSearchParams() bails the island out of
          prerendering, so the FALLBACK is what lands in the cached HTML — it has
          to be the real page-1 view, not a spinner. The island hydrates over it
          with identical markup and only changes anything if the URL carries
          ?page=/?size=. */}
      <Suspense
        fallback={
          <StoreListingsView
            storeKey={params.key}
            storeName={store.name}
            currency={COUNTRIES[country].currency}
            rows={pageRows}
            totalRows={stats.rows.length}
            page={1}
            size={size}
          />
        }
      >
        <StoreListings
          storeKey={params.key}
          storeName={store.name}
          currency={COUNTRIES[country].currency}
          initialRows={pageRows}
          totalRows={stats.rows.length}
        />
      </Suspense>

      <div className="text-sm text-slate-500">
        <Link href="/stores" className="text-brand-400 hover:underline">← All stores</Link>
        {" · "}
        <Link href="/stores/suggest" className="text-brand-400 hover:underline">Suggest a store</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num mt-0.5 font-bold text-white ${small ? "text-xs leading-snug" : "text-lg"}`}>{value}</div>
    </div>
  );
}
