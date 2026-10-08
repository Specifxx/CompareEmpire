import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ago } from "@/components/Ago";
import { BrowseGrid } from "@/components/BrowseGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayStrip } from "@/components/EbayStrip";
import { lastCheckedAt, marketProductCount, marketProducts, PAGE_SIZE, sortCards } from "@/lib/data";
import { compactCard } from "@/lib/compact";
import { timeAgo } from "@/lib/format";
import { pageHref } from "@/components/Pagination";
import type { RegionInfo } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { storesInMarket } from "@/lib/stores";

// Shared by /[region]/sealed (page 1) and /[region]/sealed/page/[n]. Both are
// ISR renders of the same list: a page segment, not ?page=, because reading
// searchParams would make the route dynamic and re-query the database on every
// request (src/lib/db.ts, rule 4).

/** Page N from its URL segment, or a 404 for "0", "abc" or "1" (page 1 is the bare URL). */
export function pageNumber(n: string): number {
  if (!/^[1-9]\d{0,3}$/.test(n) || n === "1") notFound();
  return Number(n);
}

export function browseMeta(r: RegionInfo, page: number): Metadata {
  const base = `/${r.region}/sealed`;
  const suffix = page > 1 ? ` — page ${page}` : "";
  return pageMeta({
    title: `All Pokémon sealed products in ${r.name}${suffix}`,
    description: `Every Pokémon TCG sealed product ${r.adjective} stores${r.market === "US" ? " and TCGplayer" : ""} list — booster boxes, ETBs, bundles, collections, tins and packs — with current stock and the lowest price in ${r.currency}.`,
    path: pageHref(base, page),
    // Page 1 is the canonical browse page in every region (with hreflang); a
    // later page is canonical to itself (pageMeta's default) and has no alternates.
    alternates: page > 1 ? undefined : regionAlternates(r.region, "/sealed"),
  });
}

export async function BrowsePage({ r, page }: { r: RegionInfo; page: number }) {
  if (page > 1 && page > Math.ceil((await marketProductCount(r.market)) / PAGE_SIZE)) notFound();
  const [products, checked] = await Promise.all([marketProducts(r.market), lastCheckedAt(r.market)]);
  const sorted = sortCards(products);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  if (page > pages) notFound();
  const base = `/${r.region}/sealed`;
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, page > 1 ? { href: base, label: "All sealed" } : { label: "All sealed" }, ...(page > 1 ? [{ label: `Page ${page}` }] : [])]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">All Pokémon sealed in {r.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {sorted.length.toLocaleString("en")} products across {storesInMarket(r.market).length} {r.adjective} stores
        {r.market === "US" && " and TCGplayer"}. Prices are in {r.currency} and exclude shipping.
        {checked && (
          <>
            {" "}
            Prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />.
          </>
        )}
      </p>
      <h2 className="sr-only">Products</h2>
      <div className="mt-6">
        {/* Page 1 only: the sealed Pokémon strip (image tiles of real listings; the compact CTA row when there are none), on a row of its
            own after the first products of the unfiltered list (BrowseGrid places it). */}
        <BrowseGrid
          rows={sorted.map(compactCard)}
          region={r.region}
          base={base}
          page={page}
          strip={page === 1 ? <EbayStrip region={r.region} context="sealed" placement="listings-browse" search={{ kind: "sealed", query: "" }} /> : undefined}
        />
      </div>
    </div>
  );
}
