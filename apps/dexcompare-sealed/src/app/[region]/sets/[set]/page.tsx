import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { Ago } from "@/components/Ago";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EbayBanner, NoPreFooter } from "@/components/Ebay";
import { ListingsStrip } from "@/components/ListingsStrip";
import { ProductGrid } from "@/components/ProductCard";
import { Empty, Section } from "@/components/Section";
import { lastCheckedAt, marketsWithSet, productsBySet, type ProductCardData } from "@/lib/data";
import { ebayLabel } from "@/lib/affiliate";
import { cardOpen } from "@/lib/compact";
import { gridPageHasRoomForFooter, typeChips } from "@/lib/ebay-ads";
import { money, timeAgo } from "@/lib/format";
import { packsForLabel, perPackCents } from "@/lib/packs";
import { formatRelease, isPreorderSet } from "@/lib/release";
import { regionOfMarket, regionOrNotFound, type Market, type RegionInfo } from "@/lib/regions";
import { pageMeta, regionAlternates } from "@/lib/seo";
import { PRODUCT_TYPES } from "@/lib/sealed-title";
import { SET_BY_SLUG } from "@/lib/sets";

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const getProducts = cache((market: Market, setCode: string) => productsBySet(market, setCode));

export async function generateMetadata({ params }: { params: { region: string; set: string } }): Promise<Metadata> {
  const r = regionOrNotFound(params.region);
  const s = SET_BY_SLUG.get(params.set);
  if (!s) return {};
  const products = await getProducts(r.market, s.code);
  // Empty here: noindex, and no hreflang set. Otherwise advertise only the
  // regions that list the set (their copies are the indexable ones).
  const regions = products.length ? (await marketsWithSet(s.code)).map(regionOfMarket).filter((x): x is RegionInfo => !!x) : [];
  return pageMeta({
    title: `${s.name} booster box, ETB & sealed prices in ${r.name}`,
    description: `Compare ${s.name} booster boxes, Elite Trainer Boxes, bundles and more across ${r.adjective} stores — who has it in stock and the cheapest price in ${r.currency}.`,
    path: `/${r.region}/sets/${s.slug}`,
    alternates: products.length ? regionAlternates(r.region, `/sets/${s.slug}`, regions) : undefined,
    image: s.logo,
    noindex: products.length === 0,
  });
}

// The pack-bearing types a buyer weighs against each other, in the order the
// strip shows them. Anything whose pack count varies per product (tins,
// collections) has no honest per-pack price and is left out.
const PACK_TYPES = ["Booster Box", "Elite Trainer Box", "Pokémon Center Elite Trainer Box", "Booster Bundle", "Blister", "Sleeved Booster", "Booster Pack", "Build & Battle Box"];

/** Per type, the OPEN product with the lowest price per pack — from the set's products, already loaded. */
function cheapestPerPack(products: ProductCardData[]) {
  const best = new Map<string, { p: ProductCardData; perPack: number; packs: number }>();
  for (const p of products) {
    if (!cardOpen(p) || !PACK_TYPES.includes(p.productType)) continue;
    const packs = packsForLabel(p.productType, p.setCode, p.name);
    const perPack = perPackCents(p.lowestPriceCents, packs);
    if (perPack == null || !packs) continue;
    const cur = best.get(p.productType);
    if (!cur || perPack < cur.perPack) best.set(p.productType, { p, perPack, packs });
  }
  return PACK_TYPES.filter((t) => best.has(t)).map((t) => best.get(t)!);
}

export default async function SetPage({ params }: { params: { region: string; set: string } }) {
  const r = regionOrNotFound(params.region);
  const s = SET_BY_SLUG.get(params.set);
  if (!s) notFound();
  const [products, checked] = await Promise.all([getProducts(r.market, s.code), lastCheckedAt(r.market)]);
  const pre = isPreorderSet(s.code);
  const open = products.filter(cardOpen);
  const perPack = cheapestPerPack(products);
  return (
    <div className="page py-8">
      {!gridPageHasRoomForFooter(products.length) && <NoPreFooter />}
      <Breadcrumbs items={[{ href: `/${r.region}`, label: r.name }, { href: `/${r.region}/sets`, label: "Sets" }, { label: s.name }]} />
      <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        {s.logo && <img src={s.logo} alt={`${s.name} logo`} width={192} height={80} fetchPriority="high" decoding="async" className="h-20 w-48 object-contain" />}
        <div>
          <div className="eyebrow">{s.series}</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
          <p className="mt-2 text-muted">
            {pre ? "Releases" : "Released"} {formatRelease(s.releaseDate)} · {products.length} sealed products listed in {r.name} ·{" "}
            <span className="font-semibold text-open">{open.length} in stock</span>
            {pre && " (pre-order)"}
            {checked && (
              <>
                {" "}
                · prices checked <Ago iso={checked.toISOString()} initial={timeAgo(checked)} />
              </>
            )}
          </p>
        </div>
      </div>
      {/* One unit. With eBay's API keys: this set's chase cards as real listings (they stand in for the banner's
          chip row: the banner's own search is the strip's "See more"). Without, or with none to show: the banner
          and, inside it, the set x type searches (EbayQuickSearches, "set-related"). */}
      <ListingsStrip
        region={r.region}
        context={`set:${s.slug}`}
        variant="section"
        placement="listings-set"
        className="mt-4"
        fallback={
          <EbayBanner
            region={r.region}
            variant="section"
            placement="set-banner"
            title={`Shop ${s.name} sealed on eBay`}
            text={`Search Buy It Now listings for ${s.name} on ${ebayLabel(r.region)}.`}
            query={s.name}
            chips={typeChips(s.name)}
            chipsPlacement="set-related"
          />
        }
      />
      {perPack.length > 0 && (
        <Section title={`Cheapest way to buy ${s.name} packs`} kicker={`Per booster pack, ${pre ? "cheapest pre-order" : "in stock now"}`}>
          <PerPackStrip r={r} items={perPack} />
          <p className="mt-2 text-xs text-muted">
            The lowest {pre ? "pre-order" : "in-stock"} price of each product type in {r.name}, divided by the booster packs it holds. Extras (promos, sleeves, dice)
            aren&rsquo;t priced in.
          </p>
        </Section>
      )}
      <Section title={`${s.name} sealed products`}>
        {products.length ? (
          <ProductGrid products={products} region={r.region} eager={4} feed={{ placement: "set-feed", context: s.name, query: s.name }} />
        ) : (
          <Empty>No {r.adjective} store we track lists {s.name} sealed product right now.</Empty>
        )}
      </Section>
    </div>
  );
}

function PerPackStrip({ r, items }: { r: RegionInfo; items: ReturnType<typeof cheapestPerPack> }) {
  const floor = Math.min(...items.map((i) => i.perPack));
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ p, perPack, packs }) => {
        const t = PRODUCT_TYPES.find((x) => x.label === p.productType);
        const cheapest = perPack === floor;
        return (
          <li key={p.slug}>
            <Link href={`/${r.region}/p/${p.slug}`} prefetch={false} className={`card flex h-full flex-col gap-1 p-4 transition-shadow hover:shadow-lift ${cheapest ? "border-open" : ""}`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t?.label ?? p.productType}</span>
              <span className="tabular font-display text-2xl font-bold">
                {money(perPack, r.market)} <span className="text-sm font-semibold text-muted">/ pack</span>
              </span>
              <span className="text-xs text-muted">
                {money(p.lowestPriceCents, r.market)} for {packs} {packs === 1 ? "pack" : "packs"}
              </span>
              {cheapest && <span className="mt-1 w-fit rounded-full border border-open/40 px-2 py-0.5 text-[11px] font-bold text-open">Cheapest per pack</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
