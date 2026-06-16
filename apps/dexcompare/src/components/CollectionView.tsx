"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardImage } from "./CardImage";
import { useCountry } from "./CountryProvider";
import { PortfolioChart } from "./PortfolioChart";
import { CsvTools, type ExportRow } from "./CsvTools";
import { cardHref } from "@/lib/card-url";
import { addQty, getCollection, getAllCostBases, setCostBasis, type CostBasis } from "@/lib/collection-client";
import { dollarsToCents } from "@/lib/format";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import type { CardTileData } from "./CardTile";

// /collection — the portfolio tracker. Reads the localStorage collection + cost
// basis, fetches live card data (prices follow the country cookie via /api/cards),
// and renders: a value/cost/P&L summary, a value-over-time chart, CSV import/export,
// and per-set groups with completion bars, quantity steppers and a per-card "paid"
// input that drives profit/loss.
export function CollectionView() {
  const { fmt, price, currency } = useCountry();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [bases, setBases] = useState<Record<string, CostBasis>>({});
  const [cards, setCards] = useState<CardTileData[] | null>(null); // null = loading
  // Tracks the set of owned ids we last fetched, so quantity/cost edits don't
  // trigger a refetch — only adding or removing a distinct card does.
  const idSigRef = useRef<string | null>(null);

  // Live quantities + cost bases (steppers, the paid input and CSV import all fire
  // collection-change).
  useEffect(() => {
    const sync = () => {
      setQtys(getCollection());
      setBases(getAllCostBases());
    };
    sync();
    window.addEventListener("collection-change", sync);
    return () => window.removeEventListener("collection-change", sync);
  }, []);

  // Fetch card data whenever the set of owned ids changes (mount, CSV import, or
  // adding a new card on a card page and returning).
  useEffect(() => {
    let alive = true;
    const sync = () => {
      const ids = Object.keys(getCollection()).sort();
      const sig = ids.join(",");
      if (sig === idSigRef.current) return; // quantity/cost-only change → no refetch
      idSigRef.current = sig;
      if (!ids.length) {
        setCards([]);
        return;
      }
      fetch(`/api/cards?ids=${encodeURIComponent(ids.slice(0, 500).join(","))}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive) setCards((d?.cards as CardTileData[]) ?? []);
        })
        .catch(() => {
          if (alive) setCards([]);
        });
    };
    sync();
    window.addEventListener("collection-change", sync);
    return () => {
      alive = false;
      window.removeEventListener("collection-change", sync);
    };
  }, []);

  const owned = useMemo(() => (cards ?? []).filter((c) => (qtys[c.id] ?? 0) > 0), [cards, qtys]);

  // Value, and (for holdings with a cost basis entered in the current market's
  // currency) cost + unrealised P&L. We never FX a hand-typed cost, so a basis
  // entered in another currency is left out of the P&L totals.
  const stats = useMemo(() => {
    let totalQty = 0;
    let valueCents = 0;
    let unpriced = 0;
    let costTracked = 0;
    let valueTracked = 0;
    let withBasis = 0;
    for (const c of owned) {
      const q = qtys[c.id] ?? 0;
      totalQty += q;
      const p = price(c);
      if (p == null) unpriced += 1;
      else valueCents += p * q;
      const b = bases[c.id];
      if (b && b.currency === currency) {
        withBasis += 1;
        if (p != null) {
          costTracked += b.unitCents * q;
          valueTracked += p * q;
        }
      }
    }
    const pnl = valueTracked - costTracked;
    const pnlPct = costTracked > 0 ? (pnl / costTracked) * 100 : null;
    return { totalQty, valueCents, unpriced, costTracked, pnl, pnlPct, withBasis };
  }, [owned, qtys, bases, price, currency]);

  const holdings = useMemo(
    () => owned.map((c) => ({ cardId: c.id, qty: qtys[c.id] ?? 0 })),
    [owned, qtys]
  );

  const exportRows: ExportRow[] = useMemo(
    () =>
      owned.map((c) => {
        const b = bases[c.id];
        return {
          cardId: c.id,
          name: c.name,
          setCode: c.setCode,
          collectorNumber: c.collectorNumber,
          qty: qtys[c.id] ?? 0,
          unitCostCents: b ? b.unitCents : null,
          costCurrency: b ? b.currency : null,
        };
      }),
    [owned, qtys, bases]
  );

  const groups = useMemo(() => {
    const bySet = new Map<string, { setName: string; setCode: string; cards: CardTileData[] }>();
    for (const c of owned) {
      const g = bySet.get(c.setCode) ?? { setName: c.setName, setCode: c.setCode, cards: [] };
      g.cards.push(c);
      bySet.set(c.setCode, g);
    }
    return Array.from(bySet.values())
      .map((g) => {
        const meta = POKEMON_SETS.find((s) => s.code === g.setCode);
        const subtotal = g.cards.reduce((s, c) => s + (price(c) ?? 0) * (qtys[c.id] ?? 0), 0);
        return { ...g, total: meta?.total ?? 0, logo: meta?.logo ?? null, slug: meta?.slug ?? null, subtotal };
      })
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [owned, qtys, price]);

  if (cards === null) {
    return <div className="card-surface grid place-items-center p-16 text-sm text-slate-400">Loading your collection…</div>;
  }

  if (owned.length === 0) {
    return (
      <div className="card-surface grid place-items-center p-16 text-center">
        <div>
          <p className="text-lg font-semibold text-white">No cards in your collection yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Open any card and hit <span className="font-semibold text-slate-200">Add to collection</span> —
            we&apos;ll value your cards live across every store we track and show your set progress here. Already
            have a list? Import a CSV below.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn-primary">Browse the database</Link>
            <CsvTools exportRows={exportRows} />
          </div>
        </div>
      </div>
    );
  }

  const pnlColor = stats.pnl > 0 ? "text-emerald-400" : stats.pnl < 0 ? "text-red-400" : "text-white";

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Saved in this browser · {owned.length.toLocaleString()} unique card{owned.length === 1 ? "" : "s"}
        </p>
        <CsvTools exportRows={exportRows} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Estimated value" value={fmt(stats.valueCents)} highlight />
        <Stat label="Cost basis" value={stats.withBasis ? fmt(stats.costTracked) : "—"} />
        <Stat
          label="Unrealised P&L"
          value={
            stats.withBasis
              ? `${stats.pnl >= 0 ? "+" : "−"}${fmt(Math.abs(stats.pnl))}${stats.pnlPct != null ? ` · ${stats.pnl >= 0 ? "+" : "−"}${Math.abs(stats.pnlPct).toFixed(1)}%` : ""}`
              : "—"
          }
          valueClass={stats.withBasis ? pnlColor : undefined}
        />
        <Stat label="Total cards" value={stats.totalQty.toLocaleString()} />
        <Stat label="Unique cards" value={owned.length.toLocaleString()} />
        <Stat label="Sets started" value={String(groups.length)} />
      </div>
      {stats.withBasis === 0 ? (
        <p className="-mt-3 text-xs text-slate-500">
          Enter what you paid in the <span className="text-slate-300">paid ea.</span> box on any card below to track
          profit/loss. Costs are entered in your selected market&apos;s currency ({currency}).
        </p>
      ) : (
        <p className="-mt-3 text-xs text-slate-500">
          P&L covers the {stats.withBasis} holding{stats.withBasis === 1 ? "" : "s"} you&apos;ve entered a {currency} paid
          price for{stats.unpriced > 0 ? `; ${stats.unpriced} card${stats.unpriced === 1 ? "" : "s"} have no live price right now and aren't valued` : ""}.
        </p>
      )}

      {/* Value over time */}
      <PortfolioChart holdings={holdings} />

      {/* Per-set groups */}
      {groups.map((g) => {
        const pct = g.total > 0 ? Math.round((g.cards.length / g.total) * 100) : null;
        return (
          <section key={g.setCode} className="card-surface overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 p-4">
              {g.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.logo} alt="" className="h-8 w-auto max-w-[80px] object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {g.slug ? (
                    <Link href={`/sets/${g.slug}`} className="truncate font-bold text-white hover:text-brand-400">{g.setName}</Link>
                  ) : (
                    <span className="truncate font-bold text-white">{g.setName}</span>
                  )}
                  {pct != null && (
                    <span className="text-xs text-slate-500">{g.cards.length}/{g.total} · {pct}%</span>
                  )}
                </div>
                {pct != null && (
                  <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold text-gold">{fmt(g.subtotal)}</span>
            </div>
            <ul className="divide-y divide-ink-800">
              {g.cards
                .slice()
                .sort((a, b) => (price(b) ?? 0) * (qtys[b.id] ?? 0) - (price(a) ?? 0) * (qtys[a.id] ?? 0))
                .map((c) => {
                  const q = qtys[c.id] ?? 0;
                  const p = price(c);
                  const b = bases[c.id];
                  // P&L for this row only when the cost was entered in this market's
                  // currency and we have a live price.
                  const pnl = b && b.currency === currency && p != null ? (p - b.unitCents) * q : null;
                  return (
                    <li key={c.id} className="flex items-center gap-3 p-3 hover:bg-ink-900/50">
                      <Link href={cardHref(c)} className="block h-14 w-10 shrink-0 overflow-hidden rounded">
                        <CardImage card={c} className="h-full w-full" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={cardHref(c)} className="block truncate text-sm font-semibold text-white hover:text-brand-400">
                          {c.name}
                        </Link>
                        <span className="text-xs text-slate-500">{c.setCode.toUpperCase()} · {c.collectorNumber}</span>
                      </div>
                      {/* Cost basis (paid per copy) */}
                      <input
                        // Remount when the stored basis changes externally (CSV import)
                        // so the field reflects the new value.
                        key={`${c.id}-${b?.unitCents ?? 0}-${b?.currency ?? ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        defaultValue={b ? (b.unitCents / 100).toFixed(2) : ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          setCostBasis(c.id, v ? dollarsToCents(v) : 0, currency);
                        }}
                        placeholder="paid ea."
                        aria-label={`Paid per copy of ${c.name} (${currency})`}
                        className="w-[4.5rem] shrink-0 rounded-md bg-ink-900 px-2 py-1 text-right text-xs text-white outline-none ring-1 ring-ink-700 focus:ring-brand-500"
                      />
                      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-ink-900 px-1 py-0.5">
                        <button onClick={() => addQty(c.id, -1)} aria-label="Remove one" className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-ink-800">−</button>
                        <span className="min-w-[24px] text-center text-sm font-semibold text-white">{q}</span>
                        <button onClick={() => addQty(c.id, 1)} aria-label="Add one" className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-ink-800">+</button>
                      </div>
                      <div className="w-24 shrink-0 text-right">
                        <div className="text-sm font-bold text-white">{p != null ? fmt(p * q) : "—"}</div>
                        {pnl != null ? (
                          <div className={`text-[11px] font-semibold ${pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-red-400" : "text-slate-500"}`}>
                            {pnl >= 0 ? "+" : "−"}{fmt(Math.abs(pnl))}
                          </div>
                        ) : (
                          p != null && q > 1 && <div className="text-[11px] text-slate-500">{fmt(p)} each</div>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        );
      })}

      <p className="text-center text-[11px] text-slate-600">
        Values use the cheapest live store price in your selected market and update as stores re-price.
        Your collection, costs and the resulting profit/loss are saved in this browser.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight, valueClass }: { label: string; value: string; highlight?: boolean; valueClass?: string }) {
  return (
    <div className="card-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-extrabold ${valueClass ?? (highlight ? "text-gold" : "text-white")}`}>{value}</div>
    </div>
  );
}
