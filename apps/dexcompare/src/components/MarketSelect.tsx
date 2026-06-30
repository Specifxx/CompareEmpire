"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Market picker for the DexCompare Index. "Global" is the default (a blended,
// currency-neutral composite of all four markets); the others show that single
// market's index. Preserves the current ?scope= selection.
const OPTIONS = [
  { value: "global", label: "🌐 Global (all markets)" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "US", label: "🇺🇸 United States" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
];

export function MarketSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("market") ?? "global";

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(Array.from(params.entries()));
        if (e.target.value === "global") next.delete("market");
        else next.set("market", e.target.value);
        router.push(`/market${next.toString() ? `?${next.toString()}` : ""}`);
      }}
      className="input w-auto cursor-pointer"
      aria-label="Choose market for the index"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
