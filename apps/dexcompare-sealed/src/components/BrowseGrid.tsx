"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductCardData } from "@/lib/data";
import { PRODUCT_TYPES, typeRank } from "@/lib/sealed-title";
import { SETS } from "@/lib/sets";
import type { Region } from "@/lib/regions";
import { ProductCard } from "./ProductCard";

type Sort = "relevance" | "price-asc" | "price-desc" | "newest" | "stores";
const PAGE = 48;

function norm(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Filters live in the URL (?q=&type=&set=&stock=&sort=) so a filtered view can
// be shared, but they're read AFTER hydration, not through useSearchParams: the
// cached HTML then always holds the full, unfiltered list for crawlers,
// instead of a loading fallback.
export function BrowseGrid({ products, region }: { products: ProductCardData[]; region: Region }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [set, setSet] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    setType(p.get("type") ?? "");
    setSet(p.get("set") ?? "");
    setInStock(p.get("stock") === "in");
    const s = p.get("sort") as Sort | null;
    if (s) setSort(s);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type) p.set("type", type);
    if (set) p.set("set", set);
    if (inStock) p.set("stock", "in");
    if (sort !== "relevance") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    setLimit(PAGE);
  }, [q, type, set, inStock, sort]);

  const setsHere = useMemo(() => {
    const codes = new Set(products.map((p) => p.setCode).filter(Boolean));
    return SETS.filter((s) => codes.has(s.code));
  }, [products]);
  const typesHere = useMemo(() => {
    const labels = new Set(products.map((p) => p.productType));
    return PRODUCT_TYPES.filter((t) => labels.has(t.label));
  }, [products]);

  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const typeLabel = PRODUCT_TYPES.find((t) => t.slug === type)?.label;
    const setName = (code: string | null) => (code ? SETS.find((s) => s.code === code)?.name ?? "" : "");
    let list = products.filter((p) => {
      if (typeLabel && p.productType !== typeLabel) return false;
      if (set && SETS.find((s) => s.slug === set)?.code !== p.setCode) return false;
      if (inStock && p.inStockStores === 0) return false;
      if (words.length) {
        const hay = norm(`${p.name} ${p.productType} ${setName(p.setCode)} ${p.productType === "Elite Trainer Box" ? "etb" : ""}`);
        return words.every((w) => hay.includes(w));
      }
      return true;
    });
    const price = (p: ProductCardData) => (p.inStockStores > 0 ? p.lowestPriceCents ?? Infinity : Infinity);
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return price(a) - price(b);
        case "price-desc":
          return (b.inStockStores > 0 ? b.lowestPriceCents ?? 0 : -1) - (a.inStockStores > 0 ? a.lowestPriceCents ?? 0 : -1);
        case "stores":
          return b.inStockStores - a.inStockStores || price(a) - price(b);
        case "newest":
          return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || typeRank(a.productType) - typeRank(b.productType);
        default:
          // In stock first; within that, newest set, then the chase products first.
          return (
            Number(b.inStockStores > 0) - Number(a.inStockStores > 0) ||
            (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") ||
            typeRank(a.productType) - typeRank(b.productType) ||
            a.name.localeCompare(b.name)
          );
      }
    });
    return list;
  }, [products, q, type, set, inStock, sort]);

  const shown = filtered.slice(0, limit);
  const any = q || type || set || inStock;

  return (
    <div>
      <div className="card sticky top-[4.5rem] z-30 mb-5 flex flex-col gap-3 p-3 sm:p-4 lg:top-20">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-line bg-raised px-4 py-2">
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-faint" aria-hidden="true">
              <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Filter by name or set…"
              aria-label="Filter products"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </label>
          <div className="flex gap-2">
            <select value={set} onChange={(e) => setSet(e.target.value)} aria-label="Set" className="min-w-0 flex-1 rounded-full border border-line bg-raised px-3 py-2 text-sm md:w-48">
              <option value="">All sets</option>
              {setsHere.map((s) => (
                <option key={s.code} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="min-w-0 flex-1 rounded-full border border-line bg-raised px-3 py-2 text-sm md:w-44">
              <option value="relevance">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="newest">Newest set</option>
              <option value="stores">Most stores in stock</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button onClick={() => setInStock((v) => !v)} className={`chip shrink-0 ${inStock ? "chip-on" : ""}`} aria-pressed={inStock}>
            <span className={`h-2 w-2 rounded-full ${inStock ? "bg-open" : "bg-faint"}`} aria-hidden="true" /> In stock only
          </button>
          <button onClick={() => setType("")} className={`chip shrink-0 ${type === "" ? "chip-on" : ""}`}>
            All types
          </button>
          {typesHere.map((t) => (
            <button key={t.slug} onClick={() => setType(type === t.slug ? "" : t.slug)} className={`chip shrink-0 ${type === t.slug ? "chip-on" : ""}`}>
              {t.plural}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>
          <b className="text-ink">{filtered.length.toLocaleString("en")}</b> {filtered.length === 1 ? "product" : "products"}
          {inStock ? " in stock" : ""}
        </span>
        {any && (
          <button
            onClick={() => {
              setQ("");
              setType("");
              setSet("");
              setInStock(false);
              setSort("relevance");
            }}
            className="font-semibold text-brand hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {shown.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((p, i) => (
            <ProductCard key={p.slug} p={p} region={region} priority={i < 8} />
          ))}
        </div>
      ) : (
        <div className="card px-6 py-12 text-center text-muted">Nothing matches those filters.</div>
      )}

      {filtered.length > limit && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => setLimit((n) => n + PAGE)} className="btn-ghost px-6 py-2.5">
            Show more ({(filtered.length - limit).toLocaleString("en")} left)
          </button>
        </div>
      )}
    </div>
  );
}
