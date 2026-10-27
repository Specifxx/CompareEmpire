"use client";

import { useMemo, useState } from "react";
import { CardTile, type CardTileData } from "./CardTile";
import { useCountry } from "./CountryProvider";
import { pickPrice, marketGuideCents, type Country } from "@/lib/country";

const SORTS = [
  { key: "number", label: "Set number" },
  { key: "price_desc", label: "Price: high → low" },
  { key: "price_asc", label: "Price: low → high" },
  { key: "name", label: "Name A–Z" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

// Effective value for ranking: real store price first, else the market guide /
// estimate (any source) so chase cards still surface even when only a guide
// exists. null = no figure at all (always sorted last).
function effectiveCents(card: CardTileData, country: Country): number | null {
  return pickPrice(card, country) ?? marketGuideCents(card.marketPriceCents ?? null, country);
}

// Set card grid with a client-side sort control. Sorts the cards already loaded by
// the server (the whole set) in the browser — instant, no refetch, and price sorts
// use the visitor's selected market. Addresses the "chase cards need a sorting
// filter" feedback (price ↓/↑ to find the expensive cards in a new set fast).
export function SetCardGrid({ cards }: { cards: CardTileData[] }) {
  const { country } = useCountry();
  const [sort, setSort] = useState<SortKey>("number");

  const sorted = useMemo(() => {
    if (sort === "number") return cards; // server already orders by collector number
    const arr = [...cards];
    if (sort === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      return arr;
    }
    const dir = sort === "price_desc" ? -1 : 1;
    arr.sort((a, b) => {
      const pa = effectiveCents(a, country as Country);
      const pb = effectiveCents(b, country as Country);
      if (pa == null && pb == null) return a.name.localeCompare(b.name);
      if (pa == null) return 1; // nulls always last
      if (pb == null) return -1;
      return pa === pb ? a.name.localeCompare(b.name) : (pa - pb) * dir;
    });
    return arr;
  }, [cards, sort, country]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{cards.length} cards</span>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input py-1.5 pr-8 text-sm"
            aria-label="Sort cards"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}
