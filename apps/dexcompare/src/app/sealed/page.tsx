import type { Metadata } from "next";
import Link from "next/link";
import { getSealedGroups, type SealedGroup } from "@/lib/sealed-import";
import { SealedTile } from "@/components/SealedTile";
import { SealedFilters } from "@/components/SealedFilters";
import { SealedSort } from "@/components/SealedSort";
import { AdSlot } from "@/components/AdSlot";
import { getCountry } from "@/lib/get-country";
import { COUNTRIES } from "@/lib/country";
import { SITE_URL } from "@/lib/site";

// Per-request: the market (and therefore prices/stock) comes from the country cookie.
export const dynamic = "force-dynamic";

interface SealedParams {
  q?: string;
  type?: string; // CSV of product types
  set?: string; // CSV of set codes
  min?: string;
  max?: string;
  instock?: string; // "1" = in stock only
  sort?: string;
}

function isFilteredParams(sp: SealedParams): boolean {
  return Boolean(sp.q || sp.type || sp.set || sp.min || sp.max || sp.instock || sp.sort);
}

export function generateMetadata({ searchParams }: { searchParams: SealedParams }): Metadata {
  return {
    title: "Pokémon booster packs, boxes & ETBs — compare sealed prices",
    description:
      "Browse the full Pokémon sealed-product database — booster packs, booster boxes, elite trainer boxes, bundles, collection boxes and tins — and compare live prices across stores in Australia, the US and the UK to find the cheapest place to buy.",
    alternates: { canonical: "/sealed" },
    ...(isFilteredParams(searchParams) ? { robots: { index: false, follow: true } } : {}),
  };
}

// Product-type display order; any present type not listed is appended alphabetically.
const TYPE_ORDER = [
  "Booster Box",
  "Elite Trainer Box",
  "Booster Case",
  "Collection Box",
  "Booster Bundle",
  "Bundle",
  "Tin",
  "Booster Pack",
];

const csv = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export default async function SealedPage({ searchParams }: { searchParams: SealedParams }) {
  const country = getCountry();
  const info = COUNTRIES[country];
  const all = await getSealedGroups(country);

  const q = (searchParams.q ?? "").trim().toLowerCase();
  const types = csv(searchParams.type);
  const setsSel = csv(searchParams.set);
  const minCents = searchParams.min ? Math.round(parseFloat(searchParams.min) * 100) : null;
  const maxCents = searchParams.max ? Math.round(parseFloat(searchParams.max) * 100) : null;
  const instock = searchParams.instock === "1";
  const sort = searchParams.sort ?? "";

  let groups: SealedGroup[] = all;
  if (types.length) groups = groups.filter((g) => types.includes(g.productType));
  if (setsSel.length) groups = groups.filter((g) => g.setCode != null && setsSel.includes(g.setCode));
  if (instock) groups = groups.filter((g) => g.storeCount > 0);
  if (minCents != null) groups = groups.filter((g) => g.lowestPriceCents != null && g.lowestPriceCents >= minCents);
  if (maxCents != null) groups = groups.filter((g) => g.lowestPriceCents != null && g.lowestPriceCents <= maxCents);
  if (q) groups = groups.filter((g) => `${g.name} ${g.setName ?? ""} ${g.productType}`.toLowerCase().includes(q));

  if (sort) {
    groups = [...groups];
    if (sort === "price_asc") groups.sort((a, b) => (a.lowestPriceCents ?? Infinity) - (b.lowestPriceCents ?? Infinity));
    else if (sort === "price_desc") groups.sort((a, b) => (b.lowestPriceCents ?? -1) - (a.lowestPriceCents ?? -1));
    else if (sort === "newest") groups.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    else if (sort === "name") groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Facet options — only the types/sets that actually have products in this market.
  const presentTypes = [...new Set(all.map((g) => g.productType))];
  const typeOptions = [
    ...TYPE_ORDER.filter((t) => presentTypes.includes(t)),
    ...presentTypes.filter((t) => !TYPE_ORDER.includes(t)).sort((a, b) => a.localeCompare(b)),
  ];
  const setMap = new Map<string, string>();
  for (const g of all) if (g.setCode && g.setName) setMap.set(g.setCode, g.setName);
  const setOptions = [...setMap].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));

  const isFiltered = isFilteredParams(searchParams);

  const faqs = [
    {
      q: "What Pokémon sealed products does DexCompare compare?",
      a: `DexCompare tracks booster boxes, elite trainer boxes (ETBs), booster bundles, collection boxes, tins, and individual booster packs from ${info.adjective} retailers we index. Prices are refreshed daily from each store's live listings.`,
    },
    {
      q: `Do sealed product prices include postage to ${info.place}?`,
      a: `The prices shown are each retailer's listed ${info.currency} price for the sealed product itself. Delivery fees vary by store and your location — check the retailer's checkout before buying to confirm the total landed cost.`,
    },
    {
      q: "What is the difference between a booster box and an Elite Trainer Box?",
      a: "A booster box contains 36 booster packs and nothing else. An elite trainer box (ETB) typically bundles 9 booster packs with accessories — card sleeves, dice, and a player's guide. Per booster pack, the box is nearly always cheaper; the ETB makes a better gift or starter set.",
    },
    {
      q: "How do I find the cheapest place to buy a sealed Pokémon product?",
      a: "Click any product tile to open its full price-comparison table, ranked from lowest to highest by total delivered cost. Prices update daily from each retailer's live listings.",
    },
  ];

  const collectionJsonLd = !isFiltered
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
        <div className="relative border-l-2 border-brand-500 bg-ink-900 px-6 py-8">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Pokémon sealed products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Booster boxes, elite trainer boxes, bundles, collection boxes and tins — with live{" "}
            {info.adjective} prices compared across every store we track, so you find the cheapest place
            to buy (and the best resale value). Updated daily.
          </p>
          {/* Search — preserves active filters via hidden inputs */}
          <form action="/sealed" className="mt-4 flex max-w-md gap-2">
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search sealed products (e.g. Surging Sparks booster box)"
              className="input flex-1"
              aria-label="Search sealed products"
            />
            {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
            {searchParams.set && <input type="hidden" name="set" value={searchParams.set} />}
            {searchParams.min && <input type="hidden" name="min" value={searchParams.min} />}
            {searchParams.max && <input type="hidden" name="max" value={searchParams.max} />}
            {searchParams.instock && <input type="hidden" name="instock" value={searchParams.instock} />}
            {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
            <button type="submit" className="btn-primary shrink-0">Search</button>
          </form>
        </div>
      </section>

      <AdSlot format="horizontal" height={90} />

      {/* Filters sidebar + results (same layout as the card database) */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <SealedFilters types={typeOptions} sets={setOptions} currency={info.currency} />

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="num font-semibold text-white">{groups.length.toLocaleString()}</span>{" "}
              {groups.length === 1 ? "product" : "products"}
              {searchParams.q && <> for <span className="text-brand-400">&ldquo;{searchParams.q}&rdquo;</span></>}
            </p>
            <SealedSort />
          </div>

          {groups.length === 0 ? (
            <div className="card-surface grid place-items-center p-16 text-center">
              <p className="text-lg font-semibold text-white">No sealed products found</p>
              <p className="mt-1 text-sm text-slate-400">
                {all.length === 0
                  ? `We haven't indexed any ${info.adjective} sealed products yet — check back soon.`
                  : "Try a different search or loosen the filters."}
              </p>
              <Link href="/sealed" className="btn-primary mt-4">Reset filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {groups.map((g) => (
                <SealedTile key={g.slug} group={g} currency={info.currency} />
              ))}
            </div>
          )}
        </section>
      </div>

      {!isFiltered && (
        <>
          <section className="card-surface p-6">
            <h2 className="text-lg font-extrabold text-white">Pokémon sealed products — FAQ</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="font-semibold text-white">{f.q}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        </>
      )}

      <p className="text-center text-[11px] text-slate-600">
        Prices are collected from public store listings and refreshed daily — always confirm on the
        retailer&apos;s site. DexCompare may earn a commission on some outbound links.
      </p>
    </div>
  );
}
