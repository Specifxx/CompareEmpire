import Link from "next/link";
import type { ProductCardData } from "@/lib/data";
import { money } from "@/lib/format";
import { thumb } from "@/lib/images";
import { isPreorderSet } from "@/lib/release";
import { REGIONS, type Region } from "@/lib/regions";
import { SET_BY_CODE } from "@/lib/sets";
import { StockPill } from "./StockPill";

export function ProductCard({ p, region, priority = false }: { p: ProductCardData; region: Region; priority?: boolean }) {
  const market = REGIONS[region].market;
  const open = p.inStockStores > 0;
  const pre = isPreorderSet(p.setCode);
  const set = p.setCode ? SET_BY_CODE.get(p.setCode) : null;
  const img = thumb(p.imageUrl, 400);
  return (
    <Link
      href={`/${region}/p/${p.slug}`}
      className="group card flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-square bg-raised">
        {img ? (
          <img
            src={img}
            alt={p.name}
            loading={priority ? "eager" : "lazy"}
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
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-faint">{open ? "From" : "Last listed"}</div>
            <div className={`tabular font-display text-lg font-bold ${open ? "" : "text-faint"}`}>
              {open ? money(p.lowestPriceCents, market) : "Sold out"}
            </div>
          </div>
          <StockPill state={open ? "open" : "soldout"} preorder={pre}>
            {open ? `${pre ? "Pre-order" : "In stock"} · ${p.inStockStores}` : `${p.listedStores} ${p.listedStores === 1 ? "store" : "stores"}`}
          </StockPill>
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
