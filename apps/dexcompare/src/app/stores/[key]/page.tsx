import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RETAILERS, shippingPolicyUrl, retailerCountry } from "@/lib/retailers";
import { COUNTRIES } from "@/lib/country";
import { formatMoney } from "@/lib/format";
import { storeStats } from "@/lib/store-stats";
import { parsePageNum, parsePageSize } from "@/lib/cards";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { key: string };
  searchParams: { page?: string; size?: string };
}): Promise<Metadata> {
  const store = RETAILERS[params.key];
  if (!store) notFound();
  const title = `${store.name} — Pokémon Card Prices & Store Profile`;
  const description = `Is ${store.name} cheaper? See how many Pokémon cards ${store.name} currently has at the lowest tracked price, its shipping policy, and every in-stock listing DexCompare compares.`;
  // Only page 1 claims the canonical; deeper pages and page-size permutations
  // are noindex,follow so they don't compete with it (same rule as /browse).
  const isPermutation = parsePageNum(searchParams.page) > 1 || Boolean(searchParams.size);
  return {
    title,
    description,
    alternates: { canonical: `/stores/${params.key}` },
    ...(isPermutation ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${SITE_URL}/stores/${params.key}` },
  };
}

export default async function StorePage({ params, searchParams }: { params: { key: string }; searchParams: { page?: string; size?: string } }) {
  const store = RETAILERS[params.key];
  if (!store) notFound();

  const country = retailerCountry(params.key);
  const fmt = (cents: number) => formatMoney(cents, COUNTRIES[country].currency);
  const stats = await storeStats(params.key, country);

  const page = parsePageNum(searchParams.page);
  const size = parsePageSize(searchParams.size);
  const totalPages = Math.max(1, Math.ceil(stats.rows.length / size));
  const pageRows = stats.rows.slice((page - 1) * size, (page - 1) * size + size);
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

      {/* In-stock listings, paginated */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">
          In-stock at {store.name} <span className="text-slate-500">({stats.totalInStock})</span>
        </h2>
        {pageRows.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-slate-400">No in-stock listings tracked right now.</div>
        ) : (
          <div className="card-surface overflow-hidden">
            <ul className="divide-y divide-ink-800">
              {pageRows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/card/${r.cardSlug ?? r.cardId}`} className="truncate font-semibold text-white hover:underline">
                      {r.cardName}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{r.setName} · {r.collectorNumber}</span>
                      {r.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦</span>}
                      {r.condition && <span className="chip bg-ink-800 text-slate-300">{r.condition}</span>}
                      {r.isCheapestHere && <span className="chip bg-up/15 font-semibold text-up">Cheapest here</span>}
                    </div>
                  </div>
                  <div className="num shrink-0 text-lg font-bold text-white">{fmt(r.priceCents)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && <Link href={`/stores/${params.key}?page=${page - 1}`} className="btn-ghost text-sm">← Previous</Link>}
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            {page < totalPages && <Link href={`/stores/${params.key}?page=${page + 1}`} className="btn-ghost text-sm">Next →</Link>}
          </div>
        )}
      </section>

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
