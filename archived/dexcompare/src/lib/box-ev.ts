// Booster-box expected-value data. The Pokémon Company does not publish
// official pull rates — these are community pack-opening compilations, cited
// below, and should be treated as estimates, not guarantees. Only sets we
// have real cited data for are supported; everything else shows a clear
// "not available yet" state rather than a fabricated number.
export interface PullRate {
  rarity: string; // matches (a superset of) Card.rarity values
  avgPerBox: number; // average count per standard 36-pack booster box
}

export interface PullRateSet {
  key: string;
  label: string;
  appliesToSeries: string[]; // POKEMON_SETS `series` values this covers
  source: { label: string; url: string };
  rates: PullRate[];
}

// Scarlet & Violet era — from community pack-opening data (DigitalTQ,
// Pokeloot), current as of mid-2026. Per-pack %s converted to per-36-pack-box
// averages where the source only gave a per-pack figure.
export const PULL_RATE_SETS: PullRateSet[] = [
  {
    key: "SV_ERA",
    label: "Scarlet & Violet era",
    appliesToSeries: ["Scarlet & Violet"],
    source: { label: "DigitalTQ / Pokeloot community pack-opening data", url: "https://www.digitaltq.com/scarlet-violet-pull-rates-pokemon-tcg" },
    rates: [
      { rarity: "Double Rare", avgPerBox: 7.2 },
      { rarity: "Ultra Rare", avgPerBox: 4.5 },
      { rarity: "Rare Ultra", avgPerBox: 4.5 },
      { rarity: "Illustration Rare", avgPerBox: 2.71 },
      { rarity: "Special Illustration Rare", avgPerBox: 0.64 },
      { rarity: "Hyper Rare", avgPerBox: 0.67 },
    ],
  },
];

export function pullRateSetForSeries(series: string): PullRateSet | null {
  return PULL_RATE_SETS.find((p) => p.appliesToSeries.includes(series)) ?? null;
}
