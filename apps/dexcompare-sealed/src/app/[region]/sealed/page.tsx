import type { Metadata } from "next";
import { BrowseGrid } from "@/components/BrowseGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { marketProducts, sortCards } from "@/lib/data";
import { compactCard } from "@/lib/compact";
import { REGIONS, type Region } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { storesInMarket } from "@/lib/stores";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { region: Region } }): Metadata {
  const r = REGIONS[params.region];
  if (!r) return {};
  return pageMeta({
    title: `All Pokémon sealed products in ${r.name}`,
    description: `Every Pokémon TCG sealed product ${r.adjective} stores list — booster boxes, ETBs, bundles, collections, tins and packs — with live stock and the cheapest price in ${r.currency}.`,
    path: `/${r.region}/sealed`,
    alternates: regionAlternates(r.region, "/sealed"),
  });
}

export default async function SealedPage({ params }: { params: { region: Region } }) {
  const r = REGIONS[params.region];
  const products = sortCards(await marketProducts(r.market));
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: "All sealed" }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">All Pokémon sealed in {r.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {products.length.toLocaleString("en")} products across {storesInMarket(r.market).length} {r.adjective} stores. Prices are in {r.currency} and
        exclude shipping.
      </p>
      <div className="mt-6">
        <BrowseGrid rows={products.map(compactCard)} region={r.region} />
      </div>
    </div>
  );
}
