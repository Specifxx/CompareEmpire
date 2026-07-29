"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ArbSource } from "@/lib/arbitrage";

// Buy-side source picker. The SELL side is fixed per view (TCGplayer on the flip
// view), so only the BUY side is selectable. Defaults to every tracked retail
// store. Changing it updates the URL so the server re-ranks.
//
// "Stores" here means real retail shops only — the marketplaces we resell INTO
// (eBay, TCGplayer) are sell venues, so counting them would stop the default
// selection from matching and mislabel it ("40 sources" instead of
// "Cheapest store").
function retailStores(sources: ArbSource[]): ArbSource[] {
  return sources.filter((s) => !s.isEbay && !s.isTcgplayer);
}

function buyLabel(selected: string[], sources: ArbSource[]): string {
  const stores = retailStores(sources);
  if (stores.length > 0 && selected.length === stores.length && stores.every((s) => selected.includes(s.key))) return "Cheapest store";
  if (selected.length === 1) return sources.find((s) => s.key === selected[0])?.name ?? "1 source";
  if (selected.length === sources.length) return "All sources";
  return `${selected.length} sources`;
}

export function ArbitrageFilters({
  sources,
  buy,
  sell,
  sort,
}: {
  sources: ArbSource[];
  buy: string[];
  sell: string[];
  sort: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Resolve the sell side from the actual `sell` keys so the control can never
  // drift from what the table is really ranking against.
  const sellSources = sell.map((k) => sources.find((s) => s.key === k)).filter(Boolean) as ArbSource[];
  const sellLabel = sellSources.length ? sellSources.map((s) => s.name).join(" + ") : "—";
  const sellIsEbay = sellSources.length > 0 && sellSources.every((s) => s.isEbay);

  function toggle(key: string) {
    const next = buy.includes(key) ? buy.filter((k) => k !== key) : [...buy, key];
    if (!next.length) return; // never allow an empty buy side
    const params = new URLSearchParams({ buy: next.join(","), sell: sell.join(","), sort });
    router.push(`/tools/arbitrage?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Buy from</div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-0.5 flex min-w-[150px] items-center justify-between gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:border-brand-500"
        >
          <span className="truncate">{buyLabel(buy, sources)}</span>
          <span className="text-slate-500">▾</span>
        </button>
        {open && (
          <>
            <button className="fixed inset-0 z-20 cursor-default" aria-hidden onClick={() => setOpen(false)} />
            <div className="absolute z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-2xl">
              {sources.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-ink-800">
                  <input type="checkbox" checked={buy.includes(s.key)} onChange={() => toggle(s.key)} className="accent-brand-500" />
                  <span
                    className={
                      s.isEbay
                        ? "font-semibold text-sky-300"
                        : s.isTcgplayer
                        ? "font-semibold text-brand-200"
                        : "text-slate-200"
                    }
                  >
                    {s.name}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="pb-2 text-lg text-slate-600">→</span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sell on</div>
        {/* Reflects the view's ACTUAL sell side rather than a hardcoded label —
            the flip view sells into TCGplayer, so hardcoding "eBay" here
            contradicted the SELL column in the table right below it. */}
        <div
          className={`mt-0.5 flex min-w-[110px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            sellIsEbay
              ? "border border-sky-500/30 bg-sky-500/10 text-sky-300"
              : "border border-brand-500/30 bg-brand-500/10 text-brand-200"
          }`}
        >
          {sellLabel}
        </div>
      </div>
    </div>
  );
}
