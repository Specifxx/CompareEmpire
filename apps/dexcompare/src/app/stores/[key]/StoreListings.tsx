"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PAGE_SIZES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
// Type-only import: erased at compile time, so lib/store-stats (which pulls in
// PrismaClient) never reaches the browser bundle.
import type { StoreListingRow } from "@/lib/store-stats";

// The in-stock listing table for /stores/[key], as a CLIENT island.
//
// Why: the page declared `export const revalidate` but destructured
// `searchParams` (page/size) — a dynamic API in Next 14 — so it was never
// registered for ISR and every request re-read Postgres. The server now renders
// the default view (page 1, default page size), which is the only indexable one
// and the only one Googlebot ever asks for, and that render is cacheable. Page
// changes are read from the URL here instead, and the slice is fetched from the
// CDN-cached /stores/[key]/listings endpoint.
//
// URLs are unchanged (?page=N, ?size=N), so existing links and bookmarks still
// land on the same content.

const DEFAULT_SIZE = 100;

function parsePage(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function parseSize(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE;
}

export function StoreListings({
  storeKey,
  storeName,
  currency,
  initialRows,
  totalRows,
}: {
  storeKey: string;
  storeName: string;
  currency: string;
  initialRows: StoreListingRow[];
  totalRows: number;
}) {
  const sp = useSearchParams();
  const page = parsePage(sp.get("page"));
  const size = parseSize(sp.get("size"));
  // The server-rendered slice — anything else has to be fetched.
  const isDefaultView = page === 1 && size === DEFAULT_SIZE;

  const [rows, setRows] = useState<StoreListingRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isDefaultView) {
      setRows(initialRows);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/stores/${encodeURIComponent(storeKey)}/listings?page=${page}&size=${size}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { rows: StoreListingRow[] }) => {
        if (!cancelled) setRows(data.rows ?? []);
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
  }, [isDefaultView, page, size, storeKey, initialRows]);

  // The page's cached <head> canonicalises to /stores/[key] and can no longer
  // vary its robots tag per query string (that's what made it dynamic). Keep the
  // old "permutations are noindex,follow" rule by tagging them here — the
  // canonical already points at page 1 either way.
  useEffect(() => {
    if (isDefaultView) return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,follow";
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [isDefaultView]);

  const fmt = (cents: number) => formatMoney(cents, currency);
  const totalPages = Math.max(1, Math.ceil(totalRows / size));
  const href = (p: number) => `/stores/${storeKey}?page=${p}${size === DEFAULT_SIZE ? "" : `&size=${size}`}`;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-white">
        In-stock at {storeName} <span className="text-slate-500">({totalRows})</span>
      </h2>
      {loading ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">Loading page {page}…</div>
      ) : failed ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">
          Couldn&apos;t load page {page}.{" "}
          <Link href={`/stores/${storeKey}`} className="text-brand-400 hover:underline">
            Back to page 1
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">No in-stock listings tracked right now.</div>
      ) : (
        <div className="card-surface overflow-hidden">
          <ul className="divide-y divide-ink-800">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/card/${r.cardSlug ?? r.cardId}`} className="truncate font-semibold text-white hover:underline">
                    {r.cardName}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>
                      {r.setName} · {r.collectorNumber}
                    </span>
                    {r.isFoil && <span className="chip bg-gold/15 font-semibold text-gold">✦</span>}
                    {r.condition && <span className="chip bg-ink-800 text-slate-300">{r.condition}</span>}
                    {r.isCheapestHere && <span className="chip bg-up/15 font-semibold text-up">Cheapest here</span>}
                  </div>
                </div>
                <div className="num shrink-0 text-lg font-bold text-white">{fmt(r.priceCents)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
    </section>
  );
}
