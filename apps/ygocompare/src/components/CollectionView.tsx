"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardImage } from "./CardImage";
import { useCountry } from "./CountryProvider";
import { cardHref } from "@/lib/card-url";
import { addQty, getCollection } from "@/lib/collection-client";
import { POKEMON_SETS } from "@/lib/pokemon-sets";
import type { CardTileData } from "./CardTile";

// /collection — the portfolio view. Reads the localStorage collection, fetches the
// live card data (prices follow the country cookie via /api/cards), and renders a
// summary plus per-set groups with completion bars and quantity steppers.
export function CollectionView() {
  const { fmt, price } = useCountry();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<CardTileData[] | null>(null); // null = loading

  // Track quantities live (steppers fire collection-change).
  useEffect(() => {
    const sync = () => setQtys(getCollection());
    sync();
    window.addEventListener("collection-change", sync);
    return () => window.removeEventListener("collection-change", sync);
  }, []);

  // Fetch card data once for the ids present at mount (new ids only arrive by
  // navigating to a card page, which remounts this view on return).
  useEffect(() => {
    const ids = Object.keys(getCollection());
    if (ids.length === 0) {
      setCards([]);
      return;
    }
    fetch(`/api/cards?ids=${ids.slice(0, 500).join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCards(d?.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  const owned = useMemo(() => (cards ?? []).filter((c) => (qtys[c.id] ?? 0) > 0), [cards, qtys]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let valueCents = 0;
    let unpriced = 0;
    for (const c of owned) {
      const q = qtys[c.id] ?? 0;
      totalQty += q;
      const p = price(c);
      if (p == null) unpriced += 1;
      else valueCents += p * q;
    }
    return { totalQty, valueCents, unpriced };
  }, [owned, qtys, price]);

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
            we'll value your cards live across every store we track and show your set progress here.
          </p>
          <Link href="/browse" className="btn-primary mt-4">Browse the database</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Estimated value" value={fmt(stats.valueCents)} highlight />
        <Stat label="Total cards" value={stats.totalQty.toLocaleString()} />
        <Stat label="Unique cards" value={owned.length.toLocaleString()} />
        <Stat label="Sets started" value={String(groups.length)} />
      </div>
      {stats.unpriced > 0 && (
        <p className="-mt-3 text-xs text-slate-500">
          {stats.unpriced} {stats.unpriced === 1 ? "card has" : "cards have"} no live price in your market right now and
          {stats.unpriced === 1 ? " isn't" : " aren't"} counted in the value.
        </p>
      )}

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
                      <div className="flex items-center gap-1 rounded-lg bg-ink-900 px-1 py-0.5">
                        <button onClick={() => addQty(c.id, -1)} aria-label="Remove one" className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-ink-800">−</button>
                        <span className="min-w-[24px] text-center text-sm font-semibold text-white">{q}</span>
                        <button onClick={() => addQty(c.id, 1)} aria-label="Add one" className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:bg-ink-800">+</button>
                      </div>
                      <div className="w-24 text-right">
                        <div className="text-sm font-bold text-white">{p != null ? fmt(p * q) : "—"}</div>
                        {p != null && q > 1 && <div className="text-[11px] text-slate-500">{fmt(p)} each</div>}
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
        Your collection is saved in this browser.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-extrabold ${highlight ? "text-gold" : "text-white"}`}>{value}</div>
    </div>
  );
}
