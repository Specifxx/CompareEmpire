"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CardTile, type CardTileData } from "@/components/CardTile";
import { PAGE_SIZES } from "@/lib/constants";

// The paginated card grid for /cards/[facet]/[value], as a CLIENT island.
//
// Why: the page declared `export const revalidate` but destructured
// `searchParams` (page/size) — a dynamic API in Next 14 — so it was never
// registered for ISR and every request ran four Postgres queries. The server now
// renders page 1 (the only indexable view, and the only one Googlebot requests)
// and that render is cacheable; ?page=/?size= are read from the URL here and the
// slice comes from the CDN-cached /cards/[facet]/[value]/list endpoint.
//
// The URLs themselves are unchanged, so existing links/bookmarks still work.

const DEFAULT_SIZE = 100;

function parsePage(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function parseSize(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE;
}

export function FacetCardGrid({
  facet,
  value,
  label,
  initialCards,
  total,
}: {
  facet: string;
  value: string;
  label: string;
  initialCards: CardTileData[];
  total: number;
}) {
  const sp = useSearchParams();
  const page = parsePage(sp.get("page"));
  const size = parseSize(sp.get("size"));
  const isDefaultView = page === 1 && size === DEFAULT_SIZE;

  const [cards, setCards] = useState<CardTileData[]>(initialCards);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isDefaultView) {
      setCards(initialCards);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/cards/${encodeURIComponent(facet)}/${encodeURIComponent(value)}/list?page=${page}&size=${size}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { cards: CardTileData[] }) => {
        if (!cancelled) setCards(data.cards ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDefaultView, page, size, facet, value, initialCards]);

  // The cached <head> can't vary its robots tag per query string any more (that's
  // what forced dynamic rendering). Keep the old rule — only page 1 competes in
  // the index — by tagging permutations here; the canonical already points at
  // page 1 regardless.
  useEffect(() => {
    if (isDefaultView) return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,follow";
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [isDefaultView]);

  const totalPages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => `/cards/${facet}/${value}?page=${p}${size === DEFAULT_SIZE ? "" : `&size=${size}`}`;

  return (
    <>
      {loading ? (
        <div className="card-surface grid place-items-center p-16 text-center text-sm text-slate-400">Loading page {page}…</div>
      ) : failed ? (
        <div className="card-surface grid place-items-center p-16 text-center text-sm text-slate-400">
          <p>
            Couldn&apos;t load page {page}.{" "}
            <Link href={`/cards/${facet}/${value}`} className="text-brand-400 hover:underline">
              Back to page 1
            </Link>
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="card-surface grid place-items-center p-16 text-center text-slate-400">
          <p className="text-lg font-semibold text-white">No {label} cards match this page</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className="btn-ghost text-sm">
              ← Previous
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={href(page + 1)} className="btn-ghost text-sm">
              Next →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
