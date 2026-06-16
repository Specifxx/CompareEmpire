"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONDITION_KEYS, CONDITION_MULTIPLIER, conditionInfo } from "@/lib/constants";
import { dollarsToCents, formatAUD } from "@/lib/format";

// Inline "list this exact card" form shown on a card page for verified sellers.
// (The /sell page's <SellForm> is the full card-picker version.)
export function CardListingForm({
  cardId,
  marketPriceCents,
}: {
  cardId: string;
  marketPriceCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState("NM");
  const [isFoil, setIsFoil] = useState(false);
  const [price, setPrice] = useState(
    ((marketPriceCents / 100) * (CONDITION_MULTIPLIER["NM"] ?? 1)).toFixed(2)
  );
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + List a copy of this card
      </button>
    );
  }

  const suggestedCents = Math.round(
    marketPriceCents * (CONDITION_MULTIPLIER[condition] ?? 1) * (isFoil ? 2 : 1)
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          condition,
          isFoil,
          priceCents: dollarsToCents(price),
          quantity: parseInt(quantity, 10) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create listing");
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
      <label className="mb-1 block text-xs text-slate-400">Condition</label>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CONDITION_KEYS.map((k) => {
          const c = conditionInfo(k);
          const active = condition === k;
          return (
            <button
              type="button"
              key={k}
              onClick={() => setCondition(k)}
              className="rounded-md border px-2 py-1 text-xs font-medium"
              style={{
                borderColor: active ? c.color : "#222a3d",
                backgroundColor: active ? `${c.color}22` : "transparent",
                color: active ? c.color : "#9aa0aa",
              }}
              title={c.full}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={isFoil}
          onChange={(e) => setIsFoil(e.target.checked)}
          className="h-4 w-4 accent-brand-500"
        />
        This card is a foil ✦
      </label>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-400">Price each (AUD)</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              step="0.05"
              min="0.25"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input pl-6"
              required
            />
          </div>
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs text-slate-400">Qty</label>
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPrice((suggestedCents / 100).toFixed(2))}
        className="mt-1 text-xs text-brand-400 hover:underline"
      >
        Suggested: {formatAUD(suggestedCents)} (use)
      </button>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Listing…" : "List for sale"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
