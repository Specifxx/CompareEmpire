import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NoPreFooter } from "@/components/Ebay";
import { EbayStrip } from "@/components/EbayStrip";
import { ProductGrid } from "@/components/ProductCard";
import { Empty, Section } from "@/components/Section";
import { lastCheckedAt, marketsWithType, productsByType } from "@/lib/data";
import { cardOpen } from "@/lib/compact";
import { gridPageHasRoomForFooter } from "@/lib/ebay-ads";
import { money, timeAgo } from "@/lib/format";
import { regionOfMarket, regionOrNotFound, type Market, type RegionInfo } from "@/lib/regions";
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

export async function generateMetadata({ params }: { params: { region: string; type: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const t = TYPE_BY_SLUG.get(params.type);
  if (!t) return {};
  const products = await getProducts(r.market, t.label);
  // Empty here: noindex, and no hreflang set. Otherwise advertise only the
  // regions that list the type (their copies are the indexable ones).
  const regions = products.length ? (await marketsWithType(t.label)).map(regionOfMarket).filter((x): x is RegionInfo => !!x) : [];
  return pageMeta({
    title: `Pokémon ${t.plural} — prices & stock in ${r.name}`,
    description: `Every Pokémon TCG ${t.label.toLowerCase()} ${r.adjective} stores${r.market === "US" ? " and TCGplayer" : ""} list, with who has it in stock and the cheapest price in ${r.currency}.`,
    path: `/${r.region}/type/${t.slug}`,
    alternates: products.length ? regionAlternates(r.region, `/type/${t.slug}`, regions) : undefined,
    noindex: products.length === 0,
  });
}

export default async function TypePage({ params }: { params: { region: string; type: string } }) {
  const r = regionOrNotFound(params.region);
  const t = TYPE_BY_SLUG.get(params.type);
  if (!t) notFound();
  const [products, checked] = await Promise.all([getProducts(r.market, t.label), lastCheckedAt(r.market)]);
  const open = products.filter(cardOpen);
  const sold = products.filter((p) => !cardOpen(p));
  // Store counts never include TCGplayer: in the US it is named separately.
  // Outside the US nothing is TCGplayer-only: listedStores is 0 there only when
  // no store but a dormant one lists the product (importer.ts, dormantStores).
  const tcgOnly = r.market === "US" ? products.filter((p) => p.listedStores === 0).length : 0;
  const byStores = products.length - tcgOnly;
  const typeName = t.plural.startsWith("Pokémon") ? t.plural : `Pokémon ${t.plural}`;
  // The type's own listings (cascade: generic sealed Pokémon) as an image strip; with none to list, the compact CTA row. It sits on a row of
  // its own after the first products (ProductGrid `strip`), so the products come first.
  const strip = (
    <EbayStrip
      region={r.region}
      context={`type:${t.slug}`}
      placement="listings-type"
      headings={{ type: `${typeName} on eBay`, sealed: "Sealed Pokémon on eBay" }}
      search={{ kind: "sealed", query: t.label, label: `Search ${typeName} on eBay` }}
    />
  );
  return (
    <div className="page py-8">
      {!gridPageHasRoomForFooter(products.length) && <NoPreFooter />}
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { label: t.plural }]} />
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        Pokémon {t.plural} in {r.name}
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">{ABOUT[t.slug]}</p>
      <p className="mt-2 text-sm text-muted">
        <b className="text-ink">{open.length}</b> in stock
        {open.length > 0 && <> from {money(Math.min(...open.map((p) => p.lowestPriceCents ?? Infinity)), r.market)}</>} ·{" "}
        {byStores} listed by {r.adjective} stores
        {tcgOnly > 0 && <>, {tcgOnly} more only on TCGplayer</>}
        {checked && (
          <>
            {" "}
            · prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />
          </>
        )}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {PRODUCT_TYPES.filter((x) => x.slug !== t.slug)
          .slice(0, 8)
          .map((x) => (
            <Link key={x.slug} href={`/${r.region}/type/${x.slug}`} prefetch={false} className="chip">
              {x.plural}
            </Link>
          ))}
      </div>
      <Section title="In stock now" kicker="Cheapest first">
        {open.length ? (
          <ProductGrid products={open} region={r.region} eager={4} strip={strip} />
        ) : (
          <>
            <Empty>Nothing of this type is in stock in {r.name} right now.</Empty>
            <div className="mt-4">{strip}</div>
          </>
        )}
      </Section>
      {sold.length > 0 && (
        <Section title="Sold out everywhere" kicker={`Listed, but no store${r.market === "US" ? " or TCGplayer seller" : ""} has them right now`}>
          <ProductGrid products={sold.slice(0, 48)} region={r.region} />
        </Section>
      )}
    </div>
  );
}
