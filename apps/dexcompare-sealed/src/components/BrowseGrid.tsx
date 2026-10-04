"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductCardData } from "@/lib/data";
import { cardOpen, expandCard, type CompactCard } from "@/lib/compact";
import { pctOf } from "@/lib/format";
import { packsForLabel, perPackCents } from "@/lib/packs";
import { PRODUCT_TYPES, typeRank } from "@/lib/sealed-title";
import { SETS } from "@/lib/sets";
import type { Region } from "@/lib/regions";
import { NoPreFooter } from "./Ebay";
import { MarketplaceSearch } from "./Marketplaces";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductCard";

type Sort = "relevance" | "price-asc" | "price-desc" | "per-pack" | "saving" | "newest" | "stores";
const PAGE = 48;

function norm(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Filters live in the URL (?q=&type=&set=&stock=&sort=) so a filtered view can
// be shared, but they're read AFTER hydration, not through useSearchParams: the
// cached HTML then always holds the unfiltered list for crawlers, instead of a
// loading fallback.
//
// Unfiltered, the grid is one page of 48 with real <a> links to the others
// (`${base}/page/N`, each a cached render), so every product is reachable from
// HTML. The whole list still ships (compact tuples), so as soon as a filter or
// sort is touched the grid works over everything, client-side, with "Show more".
export function BrowseGrid({ rows, region, base, page = 1 }: { rows: CompactCard[]; region: Region; base: string; page?: number }) {
  const products = useMemo(() => rows.map(expandCard), [rows]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [set, setSet] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");
  const [limit, setLimit] = useState(PAGE);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    setType(p.get("type") ?? "");
    setSet(p.get("set") ?? "");
    setInStock(p.get("stock") === "in");
    const s = p.get("sort") as Sort | null;
    if (s) setSort(s);
    setTouched(true);
  }, []);

  const any = !!(q || type || set || inStock || sort !== "relevance");

  useEffect(() => {
    if (!touched) return;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type) p.set("type", type);
    if (set) p.set("set", set);
    if (inStock) p.set("stock", "in");
    if (sort !== "relevance") p.set("sort", sort);
    const qs = p.toString();
    // A filtered view is the whole list, so it lives on the bare URL, not /page/N.
    window.history.replaceState(null, "", qs ? `${base}?${qs}` : window.location.pathname);
    setLimit(PAGE);
  }, [q, type, set, inStock, sort, base, touched]);

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
      if (inStock && !cardOpen(p)) return false;
      if (words.length) {
        const hay = norm(`${p.name} ${p.productType} ${setName(p.setCode)} ${p.productType === "Elite Trainer Box" ? "etb" : ""}`);
        return words.every((w) => hay.includes(w));
      }
      return true;
    });
    const price = (p: ProductCardData) => (cardOpen(p) ? p.lowestPriceCents ?? Infinity : Infinity);
    // Per pack: only products whose line fixes a pack count; the rest follow.
    const perPack = (p: ProductCardData) => (cardOpen(p) ? perPackCents(p.lowestPriceCents, packsForLabel(p.productType, p.setCode, p.name)) ?? Infinity : Infinity);
    // Saving vs the median of in-stock stores (three or more): most below first.
    const saving = (p: ProductCardData) => (cardOpen(p) && p.inStockStores >= 3 ? pctOf(p.lowestPriceCents ?? 0, p.medianOpenCents) ?? Infinity : Infinity);
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return price(a) - price(b);
        case "price-desc":
          return (cardOpen(b) ? b.lowestPriceCents ?? 0 : -1) - (cardOpen(a) ? a.lowestPriceCents ?? 0 : -1);
        case "per-pack":
          return perPack(a) - perPack(b) || price(a) - price(b);
        case "saving":
          return saving(a) - saving(b) || price(a) - price(b);
        case "stores":
          // Independent stores only; TCGplayer-only products follow, cheapest first.
          return b.inStockStores - a.inStockStores || price(a) - price(b);
        case "newest":
          return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || typeRank(a.productType) - typeRank(b.productType);
        default:
          // In stock first; within that, newest set, then the chase products first.
          return (
            Number(cardOpen(b)) - Number(cardOpen(a)) ||
            (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") ||
            typeRank(a.productType) - typeRank(b.productType) ||
            a.name.localeCompare(b.name)
          );
      }
    });
    return list;
  }, [products, q, type, set, inStock, sort]);

  const pages = Math.max(1, Math.ceil(products.length / PAGE));
  const shown = any ? filtered.slice(0, limit) : filtered.slice((page - 1) * PAGE, page * PAGE);
  // With nothing here, offer the same search on the marketplaces: the words
  // typed, else the set and type picked.
  const elsewhere = (
    q.trim() ||
    [SETS.find((s) => s.slug === set)?.name, PRODUCT_TYPES.find((t) => t.slug === type)?.label].filter(Boolean).join(" ")
  ).slice(0, 100);

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
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="min-w-0 flex-1 rounded-full border border-line bg-raised px-3 py-2 text-sm md:w-52">
              <option value="relevance">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="per-pack">Price per pack</option>
              <option value="saving">Biggest saving vs median</option>
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
          {!any && pages > 1 && ` · page ${page} of ${pages}`}
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
        // eBay tiles after the 12th, 24th and 36th product, searching what is filtered (or Pokémon sealed).
        <ProductGrid
          products={shown}
          region={region}
          eager={8}
          feed={{ placement: "browse-feed", context: elsewhere || "Pokémon sealed", query: elsewhere }}
        />
      ) : (
        <div className="card px-6 py-12 text-center text-muted">
          <NoPreFooter />
          Nothing matches those filters.
          {elsewhere && <MarketplaceSearch region={region} query={elsewhere} placement="browse-empty" />}
        </div>
      )}

      {any ? (
        filtered.length > limit && (
          <div className="mt-8 flex justify-center">
            <button onClick={() => setLimit((n) => n + PAGE)} className="btn-ghost px-6 py-2.5">
              Show more ({(filtered.length - limit).toLocaleString("en")} left)
            </button>
          </div>
        )
      ) : (
        <Pagination base={base} page={page} pages={pages} />
      )}
    </div>
  );
}
