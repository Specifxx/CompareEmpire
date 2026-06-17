import type { Metadata } from "next";
import Link from "next/link";
import { getSealedGroups } from "@/lib/sealed-import";
import { SealedTile } from "@/components/SealedTile";
import { AdSlot } from "@/components/AdSlot";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// Per-request: the market (and therefore prices/stock) comes from the country cookie.
export const dynamic = "force-dynamic";

export function generateMetadata({ searchParams }: { searchParams: { q?: string; type?: string } }): Metadata {
  const filtered = Boolean(searchParams.q || searchParams.type);
  return {
    title: "Pokémon booster packs, boxes & ETBs — compare sealed prices",
    description:
      "Browse the full Pokémon sealed-product database — booster packs, booster boxes, elite trainer boxes, bundles, collection boxes and tins — and compare live prices across stores in Australia, New Zealand, the US and the UK to find the cheapest place to buy.",
    alternates: { canonical: "/sealed" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

// The product-type filters, in display order. "All" is implied (no `type` param).
const TYPE_FILTERS = [
  "Booster Box",
  "Elite Trainer Box",
  "Booster Case",
  "Collection Box",
  "Booster Bundle",
  "Bundle",
  "Tin",
  "Booster Pack",
];

export default async function SealedPage({ searchParams }: { searchParams: { q?: string; type?: string } }) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const all = await getSealedGroups(country);

  const q = (searchParams.q ?? "").trim().toLowerCase();
  const type = searchParams.type ?? "";

  let groups = all;
  if (type) groups = groups.filter((g) => g.productType === type);
  if (q) groups = groups.filter((g) => `${g.name} ${g.setName ?? ""} ${g.productType}`.toLowerCase().includes(q));

  // Only show type chips that actually have products in this market.
  const present = new Set(all.map((g) => g.productType));
  const typeChips = TYPE_FILTERS.filter((t) => present.has(t));

  const chipHref = (t: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (t) sp.set("type", t);
    const s = sp.toString();
    return s ? `/sealed?${s}` : "/sealed";
  };

  // Structured data only on the canonical, unfiltered view (filtered views are noindex).
  const collectionJsonLd =
    !q && !type
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Pokémon Sealed Product Prices",
          url: `${SITE_URL}/sealed`,
          description: "Pokémon booster boxes, ETBs, bundles and packs with live prices compared across stores.",
          isPartOf: { "@type": "WebSite", name: "DexCompare", url: SITE_URL },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: all.slice(0, 24).map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/sealed/${g.slug}`,
              name: g.name,
            })),
          },
        }
      : null;

  return (
    <div className="flex flex-col gap-6">
      {collectionJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      )}
      {/* Header */}
      <section className="card-surface overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand-600/25 via-ink-850 to-gold/15 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Pokémon sealed products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Booster boxes, elite trainer boxes, bundles, collection boxes and tins — with live{" "}
            {info.adjective} prices compared across every store we track, so you find the cheapest place
            to buy (and the best resale value). Updated daily.
          </p>
          {/* Search */}
          <form action="/sealed" className="mt-4 flex max-w-md gap-2">
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search sealed products (e.g. Surging Sparks booster box)"
              className="input flex-1"
              aria-label="Search sealed products"
            />
            {type && <input type="hidden" name="type" value={type} />}
            <button type="submit" className="btn-primary shrink-0">Search</button>
          </form>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={chipHref("")}
          className={`chip border px-3 py-1.5 text-sm ${type === "" ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-ink-700 text-slate-300 hover:border-brand-500"}`}
        >
          All products
        </Link>
        {typeChips.map((t) => (
          <Link
            key={t}
            href={chipHref(t)}
            className={`chip border px-3 py-1.5 text-sm ${type === t ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-ink-700 text-slate-300 hover:border-brand-500"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      <p className="text-sm text-slate-400">
        <span className="font-semibold text-white">{groups.length.toLocaleString()}</span>{" "}
        {groups.length === 1 ? "product" : "products"}
        {searchParams.q && <> for <span className="text-brand-400">“{searchParams.q}”</span></>}
        {type && <> · {type}</>}
      </p>

      {groups.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center">
          <p className="text-lg font-semibold text-white">No sealed products found</p>
          <p className="mt-1 text-sm text-slate-400">
            {all.length === 0
              ? `We haven't indexed any ${info.adjective} sealed products yet — check back soon.`
              : "Try a different search or product type."}
          </p>
          <Link href="/sealed" className="btn-primary mt-4">Reset</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {groups.map((g) => (
            <SealedTile key={g.slug} group={g} currency={info.currency} />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-600">
        Prices are collected from public store listings and refreshed daily — always confirm on the
        retailer&apos;s site. DexCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}
