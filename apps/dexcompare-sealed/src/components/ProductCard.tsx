import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { cardOpen } from "@/lib/compact";
import { medianSaving, money, pctOf, plural } from "@/lib/format";
import { CARD_SIZES, thumb, thumbSet } from "@/lib/images";
import { packsForLabel, perPackCents } from "@/lib/packs";
import { isPreorderSet } from "@/lib/release";
import { REGIONS, type Region } from "@/lib/regions";
import { usMsrpForCard } from "@/lib/rrp";
import { SET_BY_CODE } from "@/lib/sets";
import { StockPill } from "./StockPill";

export function ProductCard({ p, region, priority = false }: { p: ProductCardData; region: Region; priority?: boolean }) {
  const market = REGIONS[region].market;
  const open = cardOpen(p);
  const n = p.inStockStores; // independent stores; TCGplayer is named, never counted
  // Sold out: listedStores leaves out dormant stores (importer.ts, dormantStores),
  // so 0 can also mean "only a dormant store lists it" — then say no more than sold out.
  const pre = isPreorderSet(p.setCode);
  const set = p.setCode ? SET_BY_CODE.get(p.setCode) : null;
  const img = thumb(p.imageUrl, 400);
  // Price signals, each a fact about the current listings: per pack when the
  // product line fixes a pack count, the median when enough stores are in
  // stock, and (US only) TPCi's published MSRP.
  const perPack = open ? perPackCents(p.lowestPriceCents, packsForLabel(p.productType, p.setCode, p.name)) : null;
  const saving = open ? medianSaving(p.lowestPriceCents, p.medianOpenCents, n) : null;
  const msrp = open ? usMsrpForCard(market, p.productType, p.setCode) : null;
  // Same rounding as the product page ("N% below US MSRP" appears at 1% or more): a price within half a percent is at MSRP.
  const belowMsrp = msrp != null && p.lowestPriceCents != null && (pctOf(p.lowestPriceCents, msrp) ?? 0) < 0;
  return (
    <Link
      href={`/${region}/p/${p.slug}`}
      prefetch={false}
      className="group card flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-square bg-raised">
        {img ? (
          <img
            src={img}
            srcSet={thumbSet(p.imageUrl, [200, 400]) ?? undefined}
            sizes={CARD_SIZES}
            alt={p.name}
            width={400}
            height={400}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-faint">{p.productType}</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-muted shadow-card backdrop-blur">
          {p.productType}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="min-h-[2.5rem]">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand sm:text-[15px]">{p.name}</h3>
          {set && <p className="mt-0.5 text-xs text-faint">{set.series}</p>}
        </div>
        {(saving || belowMsrp) && (
          <p className="flex flex-wrap gap-1.5 text-[11px] font-semibold leading-4 text-open">
            {saving && <span>{saving}</span>}
            {belowMsrp && <span className="rounded-full border border-open/40 px-1.5">below MSRP</span>}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-faint">{open ? "From" : "Last listed"}</div>
            <div className={`tabular font-display text-lg font-bold ${open ? "" : "text-faint"}`}>
              {open ? money(p.lowestPriceCents, market) : "Sold out"}
            </div>
            {perPack != null && <div className="tabular text-xs text-muted">≈ {money(perPack, market)} / pack</div>}
          </div>
          {open ? (
            <span className="flex flex-col items-start gap-0.5 sm:items-end" title={n ? `${pre ? "Pre-order" : "In stock"} at ${plural(n, "store")}${p.marketplaceOpen ? " and on TCGplayer" : ""}` : undefined}>
              <StockPill state="open" preorder={pre}>
                {n ? `${pre ? "Pre-order" : "In stock"} · ${n}` : "On TCGplayer"}
              </StockPill>
              {n > 0 && p.marketplaceOpen && <span className="px-1 text-[11px] font-medium text-muted">+ TCGplayer</span>}
            </span>
          ) : (
            <StockPill state="soldout">{p.listedStores ? plural(p.listedStores, "store") : "Sold out"}</StockPill>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, region, eager = 0 }: { products: ProductCardData[]; region: Region; eager?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.slug} p={p} region={region} priority={i < eager} />
      ))}
    </div>
  );
}
