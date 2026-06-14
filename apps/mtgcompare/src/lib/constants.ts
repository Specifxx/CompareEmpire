// Shared domain knowledge for Magic: The Gathering cards: colours (mapped onto the
// app's "domain" concept), card types, rarities and card conditions, plus the
// colours used to render them throughout the UI.

export type DomainKey =
  | "White"
  | "Blue"
  | "Black"
  | "Red"
  | "Green"
  | "Multicolor"
  | "Colorless"
  | "Land";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  // Primary + secondary colors used for generated card art gradients.
  color: string;
  color2: string;
  text: string;
}

// Magic's colour pie, coloured to match the WUBRG identity (plus gold for
// multicolour, steel for colourless artifacts, and earth for lands).
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  White: { key: "White", label: "White", color: "#e9e2c4", color2: "#9c9163", text: "#3a3520" },
  Blue: { key: "Blue", label: "Blue", color: "#2978c4", color2: "#133a66", text: "#d8e6ff" },
  Black: { key: "Black", label: "Black", color: "#5a5366", color2: "#211e29", text: "#e0dce8" },
  Red: { key: "Red", label: "Red", color: "#d3402f", color2: "#6e1a12", text: "#ffd9d4" },
  Green: { key: "Green", label: "Green", color: "#2f9e44", color2: "#14521f", text: "#d6f5dc" },
  Multicolor: { key: "Multicolor", label: "Multicolor", color: "#c9a227", color2: "#6e5512", text: "#fbeec4" },
  Colorless: { key: "Colorless", label: "Colorless", color: "#9aa3ad", color2: "#4a525c", text: "#eef2f5" },
  Land: { key: "Land", label: "Land", color: "#8a6d4b", color2: "#3f3122", text: "#f1e6d6" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Magic card types — the top-level categories shown as filters.
export const CARD_TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Artifact",
  "Planeswalker",
  "Land",
  "Battle",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Sets ------------------------------------------------------------------
// The set catalogue is generated from the offline data mirror.
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

// Magic rarities — the printed rarity wheel (common → mythic) plus special slots.
export const RARITIES: Record<string, RarityInfo> = {
  Common: { key: "Common", label: "Common", color: "#9aa0aa" },
  Uncommon: { key: "Uncommon", label: "Uncommon", color: "#9fb2c4" },
  Rare: { key: "Rare", label: "Rare", color: "#d4af37" },
  Mythic: { key: "Mythic", label: "Mythic Rare", color: "#e2592b" },
  "Mythic Rare": { key: "Mythic Rare", label: "Mythic Rare", color: "#e2592b" },
  Special: { key: "Special", label: "Special", color: "#b56ad6" },
  Promo: { key: "Promo", label: "Promo", color: "#14b8a6" },
  Land: { key: "Land", label: "Basic Land", color: "#8a6d4b" },
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

// Normalise lowercase API strings to capitalised keys ("white" -> "White").
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

// Overnumbered = collector number beyond the set's base count (e.g. the bonus
// sheet / showcase cards numbered above a set's printed total).
export function isOvernumbered(collectorNumber: string): boolean {
  if (collectorNumber.includes("*")) return false;
  const m = collectorNumber.match(/^(\d+)[a-z]?\/(\d+)/i);
  return m ? parseInt(m[1], 10) > parseInt(m[2], 10) : false;
}

export function conditionInfo(key: string): ConditionInfo {
  return CONDITIONS[key] ?? CONDITIONS.NM;
}
