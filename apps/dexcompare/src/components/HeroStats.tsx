"use client";

import { CountUp } from "./CountUp";
import { useCountry } from "./CountryProvider";
import { COUNTRIES, type Country } from "@/lib/country";

// The hero credibility strip, localised to the active market.
//
// It used to be three server-rendered numbers from the AU baseline with the label
// hardcoded to "AU stores" — so switching region changed nothing, and a US visitor
// was told how many Australian stores we track. Same root cause as the deals bug:
// the page is ISR-cached and reads no country cookie, so anything market-specific
// has to be chosen on the client.
//
// It was also inaccurate in a second way: the store count came from the retailer
// CONFIG, which counts integrations we've *configured* rather than ones actually
// returning listings (40 AU configured vs 25 producing rows at the time of
// writing). The server now passes counts derived from live data per market.
export function HeroStats({
  totalCards,
  inStockByMarket,
  storeCountByMarket,
}: {
  totalCards: number;
  inStockByMarket: Partial<Record<Country, number>>;
  storeCountByMarket: Partial<Record<Country, number>>;
}) {
  const { country } = useCountry();
  const inStock = inStockByMarket[country] ?? 0;
  const stores = storeCountByMarket[country] ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
      <Stat value={totalCards} label="cards" />
      <span className="text-ink-700" aria-hidden>·</span>
      <Stat value={inStock} label="in-stock listings" />
      <span className="text-ink-700" aria-hidden>·</span>
      <Stat value={stores} label={`${COUNTRIES[country].adjective} stores`} />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="num font-extrabold text-slate-200"><CountUp value={value} /></span>{" "}
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  );
}
