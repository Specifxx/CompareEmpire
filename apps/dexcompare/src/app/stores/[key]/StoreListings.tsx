"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PAGE_SIZES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
// Type-only import: erased at compile time, so lib/store-stats (which pulls in
// PrismaClient) never reaches the browser bundle.
import type { StoreListingRow } from "@/lib/store-stats";

// The in-stock listing table for /stores/[key].
//
// Why it's split into a presentational view + a hook wrapper:
// the page declared `export const revalidate` but destructured `searchParams`
// (page/size) — a dynamic API in Next 14 — so it was never registered for ISR and
// every request re-ran storeStats() against Postgres. Pagination therefore has to
// be read on the client instead. But `useSearchParams()` makes Next bail the
// component out of prerendering entirely (BAILOUT_TO_CLIENT_SIDE_RENDERING) and
// render the Suspense FALLBACK into the static HTML — so the fallback has to BE
// the default view, or Googlebot would index a spinner.
//
// So: <StoreListingsView> is a plain props-in/markup-out component (no hooks) the
// server page renders as the Suspense fallback — that's the page-1 HTML that gets
// cached and crawled. <StoreListings> is the client island that hydrates over it,
// re-reads ?page=/?size= from the URL and fetches that slice from the CDN-cached
// /stores/[key]/listings endpoint. Same URLs as before, so existing links and
// bookmarks are unaffected.

export const STORE_PAGE_SIZE = 100; // == parsePageSize(undefined)

function parsePage(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function parseSize(v: string | null): number {
  const n = parseInt(v ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : STORE_PAGE_SIZE;
}

interface ViewProps {
  storeKey: string;
  storeName: string;
  currency: string;
  rows: StoreListingRow[];
  totalRows: number;
  page: number;
  size: number;
  status?: "ok" | "loading" | "failed";
}

export function StoreListingsView({
  storeKey,
  storeName,
  currency,
  rows,
  totalRows,
  page,
  size,
  status = "ok",
}: ViewProps) {
  const fmt = (cents: number) => formatMoney(cents, currency);
  const totalPages = Math.max(1, Math.ceil(totalRows / size));
  const href = (p: number) => `/stores/${storeKey}?page=${p}${size === STORE_PAGE_SIZE ? "" : `&size=${size}`}`;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-white">
        In-stock at {storeName} <span className="text-slate-500">({totalRows})</span>
      </h2>
      {status === "loading" ? (
        <div className="card-surface p-8 text-center text-sm text-slate-400">Loading page {page}…</div>
      ) : status === "failed" ? (
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
  // The server-rendered (and cached) slice — anything else has to be fetched.
  const isDefaultView = page === 1 && size === STORE_PAGE_SIZE;

  const [rows, setRows] = useState<StoreListingRow[]>(initialRows);
  const [status, setStatus] = useState<"ok" | "loading" | "failed">("ok");

  useEffect(() => {
    if (isDefaultView) {
      setRows(initialRows);
      setStatus("ok");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(`/stores/${encodeURIComponent(storeKey)}/listings?page=${page}&size=${size}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { rows: StoreListingRow[] }) => {
        if (cancelled) return;
        setRows(data.rows ?? []);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [isDefaultView, page, size, storeKey, initialRows]);

  // The page's cached <head> canonicalises to /stores/[key] and can no longer vary
  // its robots tag per query string (that read is what made it dynamic). Keep the
  // old "only page 1 competes in the index" rule by tagging permutations here.
  useEffect(() => {
    if (isDefaultView) return;
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,follow";
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [isDefaultView]);

  return (
    <StoreListingsView
      storeKey={storeKey}
      storeName={storeName}
      currency={currency}
      rows={rows}
      totalRows={totalRows}
      page={page}
      size={size}
      status={status}
    />
  );
}
