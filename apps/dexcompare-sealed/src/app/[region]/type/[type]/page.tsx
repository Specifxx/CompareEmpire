import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductCard";
import { Empty, Section } from "@/components/Section";
import { productsByType } from "@/lib/data";
import { money } from "@/lib/format";
import { REGIONS, type Market, type Region } from "@/lib/regions";
import { PRODUCT_TYPES, TYPE_BY_SLUG } from "@/lib/sealed-title";
import { pageMeta, regionAlternates } from "@/lib/seo";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

// A sentence per type that says what it is, so a category page is more than a grid.
const ABOUT: Record<string, string> = {
  "booster-boxes": "A booster box (or booster display) is a sealed case of 36 booster packs from one set — the cheapest way to buy packs in bulk and the product most collectors keep sealed.",
  "elite-trainer-boxes": "An Elite Trainer Box holds 8–9 booster packs plus sleeves, energy cards, dice, condition markers and a storage box, and usually a set-exclusive promo card.",
  "pokemon-center-elite-trainer-boxes": "Pokémon Center Elite Trainer Boxes add extra packs and a stamped promo to the retail ETB, and were originally sold only through the Pokémon Center.",
  "booster-bundles": "A booster bundle is six booster packs from one set in a single sleeve — a lower-cost step between loose packs and an ETB.",
  "ultra-premium-collections": "Ultra-Premium Collections are the top-end collector boxes: many packs, metal or foil promo cards and premium accessories.",
  collections: "Collection boxes pair booster packs with promo cards, figures, pins or binders — often themed on a single Pokémon.",
  tins: "Tins hold booster packs and a promo card in a collectable metal case; mini tins hold fewer packs and a coin or art card.",
  "build-and-battle-boxes": "Build & Battle Boxes are the prerelease kit: four booster packs, an evolution pack and a promo card, built to play a deck on day one.",
  "build-and-battle-stadiums": "A Build & Battle Stadium is two Build & Battle kits plus extra packs, for two players.",
  blisters: "Blister packs hold one to three booster packs with a promo card or coin, sold on pegs at most retailers.",
  "sleeved-boosters": "Sleeved boosters are single booster packs in a retail sleeve.",
  "booster-packs": "Single booster packs, loose. Prices are per pack.",
  decks: "Ready-to-play decks: League Battle Decks, Battle Academy and theme decks.",
  "booster-box-cases": "A booster box case is a sealed case of booster boxes (usually six), straight from the distributor.",
  "elite-trainer-box-cases": "A sealed case of Elite Trainer Boxes (usually ten).",
  "booster-bundle-cases": "A sealed case of booster bundles.",
};

const getProducts = cache((market: Market, typeLabel: string) => productsByType(market, typeLabel));

export async function generateMetadata({ params }: { params: { region: Region; type: string } }): Promise<Metadata> {
  const r = REGIONS[params.region];
  const t = TYPE_BY_SLUG.get(params.type);
  if (!r || !t) return {};
  const products = await getProducts(r.market, t.label);
  return pageMeta({
    title: `Pokémon ${t.plural} — prices & stock in ${r.name}`,
    description: `Every Pokémon TCG ${t.label.toLowerCase()} ${r.adjective} stores list, with who has it in stock and the cheapest price in ${r.currency}. Restock alerts included.`,
    path: `/${r.region}/type/${t.slug}`,
    alternates: regionAlternates(r.region, `/type/${t.slug}`),
    noindex: products.length === 0,
  });
}

export default async function TypePage({ params }: { params: { region: Region; type: string } }) {
  const r = REGIONS[params.region];
  const t = TYPE_BY_SLUG.get(params.type);
  if (!t) notFound();
  const products = await getProducts(r.market, t.label);
  const open = products.filter((p) => p.inStockStores > 0);
  const sold = products.filter((p) => p.inStockStores === 0);
  return (
    <div className="page py-8">
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: t.plural }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Pokémon {t.plural} in {r.name}
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">{ABOUT[t.slug]}</p>
      <p className="mt-2 text-sm text-muted">
        <b className="text-ink">{open.length}</b> in stock
        {open.length > 0 && <> from {money(Math.min(...open.map((p) => p.lowestPriceCents ?? Infinity)), r.market)}</>} ·{" "}
        {products.length} listed by {r.adjective} stores
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {PRODUCT_TYPES.filter((x) => x.slug !== t.slug)
          .slice(0, 8)
          .map((x) => (
            <Link key={x.slug} href={`/${r.region}/type/${x.slug}`} className="chip">
              {x.plural}
            </Link>
          ))}
      </div>
      <Section title="In stock now" kicker="Cheapest first">
        {open.length ? <ProductGrid products={open} region={r.region} eager={4} /> : <Empty>Nothing of this type is in stock in {r.name} right now.</Empty>}
      </Section>
      {sold.length > 0 && (
        <Section title="Sold out everywhere" kicker="Set an alert on any of these">
          <ProductGrid products={sold.slice(0, 48)} region={r.region} />
        </Section>
      )}
    </div>
  );
}
