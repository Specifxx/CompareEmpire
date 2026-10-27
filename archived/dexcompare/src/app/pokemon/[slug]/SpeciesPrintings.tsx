"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { PAGE_SIZES } from "@/lib/constants";

// The filter/sort/paginate section of a species hub.
//
// Why it's split into a presentational view + a hook wrapper:
// the page declared `export const revalidate` but destructured `searchParams`
// (set/era/rarity/sort/page/size) — a dynamic API in Next 14 — so the hub was never
// registered for ISR and every request re-queried Postgres. Filter state therefore
// has to be read on the client. But `useSearchParams()` makes Next bail the
// component out of prerendering (BAILOUT_TO_CLIENT_SIDE_RENDERING) and render the
// Suspense FALLBACK into the static HTML — so the fallback has to BE the default
// view, otherwise the cached, crawled HTML would be a spinner instead of the
// printings grid this page exists to show.
//
// <SpeciesPrintingsView> is hook-free markup (the server page renders it as the
// fallback = the indexable default view), and <SpeciesPrintings> is the island that
// hydrates over it, reads the chips' query params from the URL and fetches the
// matching slice from the CDN-cached /pokemon/[slug]/printings endpoint. The chips
// are still ordinary <Link>s to the same URLs, so nothing about links, history or
// sharing changes.

export const SPECIES_PAGE_SIZE = 100; // == parsePageSize(undefined)

const SORTS = [
  { key: "relevance", label: "Relevance" },
  { key: "price_desc", label: "Price: high → low" },
  { key: "price_asc", label: "Price: low → high" },
  { key: "number", label: "Set, then number" },
] as const;

function parsePage(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function parseSize(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : SPECIES_PAGE_SIZE;
}

interface Query {
  set?: string;
  era?: string;
  rarity?: string;
  sort?: string;
  page: number;
  size: number;
}

interface ViewProps {
  slug: string;
  speciesName: string;
  eras: string[];
  rarities: string[];
  cards: CardTileData[];
  total: number;
  query: Query;
  status?: "ok" | "loading" | "failed";
}

export function SpeciesPrintingsView({
  slug,
  speciesName,
  eras,
  rarities,
  cards,
  total,
  query,
  status = "ok",
}: ViewProps) {
  const { set, era, rarity, sort, page, size } = query;

  // Same URL shape as before: merge overrides into the current query string.
  const qs = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      set,
      era,
      rarity,
      sort,
      page: page > 1 ? String(page) : undefined,
      size: size === SPECIES_PAGE_SIZE ? undefined : String(size),
      ...overrides,
    };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
    const s = usp.toString();
    return s ? `?${s}` : "";
  };

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">
          All {speciesName} printings <span className="text-slate-500">({total})</span>
        </h2>
      </div>

      {/* Filter/sort links — real <a href>s, so they stay crawlable and work
          without JS (each one is a normal navigation to a cached page). */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={`/pokemon/${slug}${qs({ sort: s.key === "relevance" ? undefined : s.key, page: undefined })}`}
            className={`chip border px-3 py-1 text-xs ${
              (sort ?? "relevance") === s.key
                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                : "border-ink-700 text-slate-400 hover:border-brand-500"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      {eras.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Era</span>
          {eras.map((e) => (
            <Link
              key={e}
              href={`/pokemon/${slug}${qs({ era: era === e ? undefined : e, page: undefined })}`}
              className={`chip border px-2.5 py-1 text-xs ${
                era === e ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
              }`}
            >
              {e}
            </Link>
          ))}
        </div>
      )}
      {rarities.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rarity</span>
          {rarities.map((r) => (
            <Link
              key={r}
              href={`/pokemon/${slug}${qs({ rarity: rarity === r ? undefined : r, page: undefined })}`}
              className={`chip border px-2.5 py-1 text-xs ${
                rarity === r ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:border-brand-500"
              }`}
            >
              {r}
            </Link>
          ))}
        </div>
      )}

      {status === "loading" ? (
        <div className="card-surface grid place-items-center p-12 text-center text-sm text-slate-400">Loading printings…</div>
      ) : status === "failed" ? (
        <div className="card-surface grid place-items-center p-12 text-center text-sm text-slate-400">
          <div>
            <p>Couldn&apos;t load these printings.</p>
            <Link href={`/pokemon/${slug}`} className="btn-ghost mt-3">
              Show all printings
            </Link>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-12 text-center text-slate-400">
          <div>
            <p className="text-lg font-semibold text-white">No printings match these filters</p>
            <Link href={`/pokemon/${slug}`} className="btn-ghost mt-3">
              Clear filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/pokemon/${slug}${qs({ page: String(page - 1) })}`} className="btn-ghost text-sm">
              ← Previous
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/pokemon/${slug}${qs({ page: String(page + 1) })}`} className="btn-ghost text-sm">
              Next →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function SpeciesPrintings({
  slug,
  speciesName,
  eras,
  rarities,
  initialCards,
  initialTotal,
}: {
  slug: string;
  speciesName: string;
  eras: string[];
  rarities: string[];
  initialCards: CardTileData[];
  initialTotal: number;
}) {
  const sp = useSearchParams();
  const query: Query = {
    set: sp.get("set") ?? undefined,
    era: sp.get("era") ?? undefined,
    rarity: sp.get("rarity") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    page: parsePage(sp.get("page")),
    size: parseSize(sp.get("size")),
  };
  // Exactly what the server rendered (and cached): no filters, default sort, page 1.
  const isDefaultView =
    !query.set && !query.era && !query.rarity && !query.sort && query.page === 1 && query.size === SPECIES_PAGE_SIZE;

  const [cards, setCards] = useState<CardTileData[]>(initialCards);
  const [total, setTotal] = useState(initialTotal);
  const [status, setStatus] = useState<"ok" | "loading" | "failed">("ok");

  const { set, era, rarity, sort, page, size } = query;
  useEffect(() => {
    if (isDefaultView) {
      setCards(initialCards);
      setTotal(initialTotal);
      setStatus("ok");
      return;
    }
    const qs = new URLSearchParams();
    if (set) qs.set("set", set);
    if (era) qs.set("era", era);
    if (rarity) qs.set("rarity", rarity);
    if (sort) qs.set("sort", sort);
    qs.set("page", String(page));
    qs.set("size", String(size));

    let cancelled = false;
    setStatus("loading");
    fetch(`/pokemon/${encodeURIComponent(slug)}/printings?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { cards: CardTileData[]; total: number }) => {
        if (cancelled) return;
        setCards(data.cards ?? []);
        setTotal(data.total ?? 0);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [isDefaultView, set, era, rarity, sort, page, size, slug, initialCards, initialTotal]);

  // The cached <head> can't vary its robots tag per query string any more (that
  // read is exactly what made this route dynamic), so keep the old "filtered
  // permutations are noindex,follow" rule here. The canonical in the cached head
  // already points at the bare hub for every permutation.
  useEffect(() => {
    if (isDefaultView) return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,follow";
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [isDefaultView]);

  return (
    <SpeciesPrintingsView
      slug={slug}
      speciesName={speciesName}
      eras={eras}
      rarities={rarities}
      cards={cards}
      total={total}
      query={query}
      status={status}
    />
  );
}
