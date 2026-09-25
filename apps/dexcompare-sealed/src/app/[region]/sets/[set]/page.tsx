import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductCard";
import { Empty, Section } from "@/components/Section";
import { productsBySet } from "@/lib/data";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { REGIONS, type Market, type Region } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { SET_BY_SLUG } from "@/lib/sets";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const getProducts = cache((market: Market, setCode: string) => productsBySet(market, setCode));

export async function generateMetadata({ params }: { params: { region: Region; set: string } }): Promise<Metadata> {
  const r = REGIONS[params.region];
  const s = SET_BY_SLUG.get(params.set);
  if (!r || !s) return {};
  const products = await getProducts(r.market, s.code);
  return pageMeta({
    title: `${s.name} booster box, ETB & sealed prices in ${r.name}`,
    description: `Compare ${s.name} booster boxes, Elite Trainer Boxes, bundles and more across ${r.adjective} stores — who has it in stock and the cheapest price in ${r.currency}.`,
    path: `/${r.region}/sets/${s.slug}`,
    alternates: regionAlternates(r.region, `/sets/${s.slug}`),
    image: s.logo,
    noindex: products.length === 0,
  });
}

export default async function SetPage({ params }: { params: { region: Region; set: string } }) {
  const r = REGIONS[params.region];
  const s = SET_BY_SLUG.get(params.set);
  if (!s) notFound();
  const products = await getProducts(r.market, s.code);
  const pre = isPreorderSet(s.code);
  const open = products.filter((p) => p.inStockStores > 0);
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { href: `/${r.region}/sets`, label: "Sets" }, { label: s.name }]} />
      <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        {s.logo && <img src={s.logo} alt={`${s.name} logo`} className="h-20 w-48 object-contain" />}
        <div>
          <div className="eyebrow">{s.series}</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
          <p className="mt-2 text-muted">
            {pre ? "Releases" : "Released"} {formatRelease(s.releaseDate)} · {products.length} sealed products listed in {r.name} ·{" "}
            <span className="font-semibold text-open">{open.length} in stock</span>
            {pre && " (pre-order)"}
          </p>
        </div>
      </div>
      <Section title={`${s.name} sealed products`}>
        {products.length ? (
          <ProductGrid products={products} region={r.region} eager={4} />
        ) : (
          <Empty>No {r.adjective} store we track lists {s.name} sealed product right now.</Empty>
        )}
      </Section>
    </div>
  );
}
