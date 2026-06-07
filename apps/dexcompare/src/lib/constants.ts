// Shared domain knowledge for Pokémon TCG cards: energy types (mapped onto the
// app's "domain" concept), supertypes, rarities and card conditions, plus the
// colours used to render them throughout the UI.

export type DomainKey =
  | "Grass"
  | "Fire"
  | "Water"
  | "Lightning"
  | "Psychic"
  | "Fighting"
  | "Darkness"
  | "Metal"
  | "Fairy"
  | "Dragon"
  | "Colorless";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  // Primary + secondary colors used for generated card art gradients.
  color: string;
  color2: string;
  text: string;
}

// Pokémon energy types, coloured to match the TCG.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  Grass: { key: "Grass", label: "Grass", color: "#3fa129", color2: "#1e5915", text: "#e0f7d4" },
  Fire: { key: "Fire", label: "Fire", color: "#e62829", color2: "#7a1416", text: "#ffd9d9" },
  Water: { key: "Water", label: "Water", color: "#2980ef", color2: "#143a6b", text: "#d8e6ff" },
  Lightning: { key: "Lightning", label: "Lightning", color: "#f6c707", color2: "#7a5e00", text: "#fff3c4" },
  Psychic: { key: "Psychic", label: "Psychic", color: "#ef4179", color2: "#6b1535", text: "#ffd9ea" },
  Fighting: { key: "Fighting", label: "Fighting", color: "#e0701f", color2: "#5e2e0a", text: "#ffe6cd" },
  Darkness: { key: "Darkness", label: "Darkness", color: "#5a5366", color2: "#211e29", text: "#e0dce8" },
  Metal: { key: "Metal", label: "Metal", color: "#8a8a9e", color2: "#3d3d47", text: "#eef0f5" },
  Fairy: { key: "Fairy", label: "Fairy", color: "#ef6fb7", color2: "#6b2b4f", text: "#ffdcef" },
  Dragon: { key: "Dragon", label: "Dragon", color: "#cda320", color2: "#5e4a0e", text: "#fbeec4" },
  Colorless: { key: "Colorless", label: "Colorless", color: "#b9b6a8", color2: "#57544a", text: "#f3f1ea" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Pokémon TCG supertypes — the top-level card categories.
export const CARD_TYPES = ["Pokémon", "Trainer", "Energy"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Sets ------------------------------------------------------------------
// The full catalogue (173 sets) is generated from the offline data mirror.
import { POKEMON_SETS } from "./pokemon-sets";

export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = POKEMON_SETS.map((s) => ({ code: s.code, name: s.name, slug: s.slug }));
export const setBySlug = (slug: string): SetInfo | undefined => SETS.find((s) => s.slug === slug);
export const setByCode = (code: string): SetInfo | undefined => SETS.find((s) => s.code === code);

export interface RarityInfo {
  key: string;
  label: string;
  color: string;
}

// Pokémon rarities span 39 printed values; we colour the common families and
// fall back to a neutral grey for anything unmapped (see rarityInfo).
export const RARITIES: Record<string, RarityInfo> = {
  Common: { key: "Common", label: "Common", color: "#9aa0aa" },
  Uncommon: { key: "Uncommon", label: "Uncommon", color: "#30a46c" },
  Rare: { key: "Rare", label: "Rare", color: "#3b82f6" },
  "Rare Holo": { key: "Rare Holo", label: "Rare Holo", color: "#6366f1" },
  "Double Rare": { key: "Double Rare", label: "Double Rare", color: "#8b5cf6" },
  "Ultra Rare": { key: "Ultra Rare", label: "Ultra Rare", color: "#a855f7" },
  "Rare Ultra": { key: "Rare Ultra", label: "Ultra Rare", color: "#a855f7" },
  "Illustration Rare": { key: "Illustration Rare", label: "Illustration Rare", color: "#ec4899" },
  "Special Illustration Rare": { key: "Special Illustration Rare", label: "Special Illustration Rare", color: "#f472b6" },
  "Rare Secret": { key: "Rare Secret", label: "Secret Rare", color: "#f5a524" },
  "Rare Rainbow": { key: "Rare Rainbow", label: "Rainbow Rare", color: "#f97316" },
  "Hyper Rare": { key: "Hyper Rare", label: "Hyper Rare", color: "#fbbf24" },
  Promo: { key: "Promo", label: "Promo", color: "#14b8a6" },
};

export const RARITY_KEYS = Object.keys(RARITIES);

export interface ConditionInfo {
  key: string;
  label: string;
  full: string;
  color: string;
}

// Card grading scale used across TCG marketplaces.
export const CONDITIONS: Record<string, ConditionInfo> = {
  NM: { key: "NM", label: "NM", full: "Near Mint", color: "#30a46c" },
  LP: { key: "LP", label: "LP", full: "Lightly Played", color: "#86b300" },
  MP: { key: "MP", label: "MP", full: "Moderately Played", color: "#f5a524" },
  HP: { key: "HP", label: "HP", full: "Heavily Played", color: "#f5793b" },
  DMG: { key: "DMG", label: "DMG", full: "Damaged", color: "#e5484d" },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);

// Relative value multipliers applied to a card's reference price per condition.
export const CONDITION_MULTIPLIER: Record<string, number> = {
  NM: 1.0,
  LP: 0.85,
  MP: 0.7,
  HP: 0.55,
  DMG: 0.4,
};

export function domainInfo(key: string): DomainInfo {
  return DOMAINS[(key as DomainKey)] ?? DOMAINS.Colorless;
}

// Normalise lowercase API strings to capitalised keys ("water" -> "Water").
export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function rarityInfo(key: string): RarityInfo {
  return RARITIES[key] ?? { key, label: key, color: "#9aa0aa" };
}

// Signature = a "*" in the collector number. (Kept for cross-app compatibility.)
export function isSignature(collectorNumber: string): boolean {
  return collectorNumber.includes("*");
}

// Overnumbered = collector number beyond the set's base count (e.g. 199/165) —
// the Pokémon "secret rare" numbering. Excludes signatures.
export function isOvernumbered(collectorNumber: string): boolean {
  if (collectorNumber.includes("*")) return false;
  const m = collectorNumber.match(/^(\d+)[a-z]?\/(\d+)/i);
  return m ? parseInt(m[1], 10) > parseInt(m[2], 10) : false;
}

export function conditionInfo(key: string): ConditionInfo {
  return CONDITIONS[key] ?? CONDITIONS.NM;
}
