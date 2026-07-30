"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWishlist } from "@/lib/wishlist-client";
import { useCountry } from "./CountryProvider";
import { formatMoney } from "@/lib/format";

interface SplitLine {
  cardId: string;
  slug: string | null;
  name: string;
  setCode: string;
  collectorNumber: string;
  retailerName: string | null;
  priceCents: number | null;
  url: string | null;
}
interface Result {
  requested: number;
  split: { totalCents: number; foundCount: number; storeCount: number; lines: SplitLine[] };
  bestSingle: { retailerName: string; totalCents: number; coveredCount: number } | null;
}

export function BestBasketView() {
  const { country, currency } = useCountry();
  const [state, setState] = useState<"loading" | "empty" | "done" | "error">("loading");
  const [result, setResult] = useState<Result | null>(null);
  const fmt = (c: number) => formatMoney(c, currency);

  useEffect(() => {
    const ids = getWishlist();
    if (ids.length === 0) {
      setState("empty");
      return;
    }
    fetch("/api/tools/best-basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardIds: ids, market: country }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Result) => {
        setResult(data);
        setState("done");
      })
      .catch(() => setState("error"));
  }, [country]);

  if (state === "loading") return <div className="card-surface p-8 text-center text-sm text-slate-400">Loading your wishlist…</div>;

  if (state === "empty") {
    return (
      <div className="card-surface p-8 text-center text-sm text-slate-400">
        <p className="font-semibold text-white">Your wishlist is empty</p>
        <p className="mt-1">Add cards to your wishlist and come back — this tool prices your whole want list.</p>
        <Link href="/browse" className="btn-primary mt-4 inline-flex">Browse cards →</Link>
      </div>
    );
  }

  if (state === "error" || !result) {
    return <div className="card-surface p-8 text-center text-sm text-slate-400">Something went wrong pricing your basket — try again.</div>;
  }

  const savingCents = result.bestSingle && result.bestSingle.coveredCount === result.split.foundCount
    ? result.bestSingle.totalCents - result.split.totalCents
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Cards priced" value={`${result.split.foundCount} / ${result.requested}`} />
        <Stat label="Split basket total" value={fmt(result.split.totalCents)} sub={`${result.split.storeCount} stores`} highlight />
        {result.bestSingle && (
          <Stat
            label="Cheapest single store"
            value={fmt(result.bestSingle.totalCents)}
            sub={`${result.bestSingle.retailerName} · ${result.bestSingle.coveredCount}/${result.requested} covered`}
          />
        )}
      </div>

      {savingCents != null && savingCents > 0 && (
        <p className="text-sm text-slate-300">
          Splitting your basket across {result.split.storeCount} stores saves{" "}
          <strong className="text-up">{fmt(savingCents)}</strong> vs buying everything from one store — but check
          postage on each store adds up before deciding.
        </p>
      )}

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-800 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Card</th><th className="px-4 py-2">Cheapest store</th><th className="px-4 py-2 text-right">Price</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {result.split.lines.map((l) => (
              <tr key={l.cardId}>
                <td className="px-4 py-2">
                  <Link href={`/card/${l.slug ?? l.cardId}`} className="font-semibold text-white hover:underline">{l.name}</Link>
                  <div className="text-[11px] text-slate-500">{l.setCode} · {l.collectorNumber}</div>
                </td>
                <td className="px-4 py-2 text-slate-400">{l.retailerName ?? "—"}</td>
                <td className="num px-4 py-2 text-right text-white">
                  {l.priceCents != null ? (l.url ? <a href={l.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-brand-400">{fmt(l.priceCents)}</a> : fmt(l.priceCents)) : "not found"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-600">
        Basket capped at 300 cards per request. Prices exclude postage — check each store&apos;s shipping before
        deciding whether splitting is really cheaper.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="card-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num mt-0.5 text-lg font-bold ${highlight ? "text-accent" : "text-white"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
