// Shared domain knowledge for the One Piece Card Game: card colours (mapped onto
// the app's "domain" concept), card categories, rarities and conditions, plus the
// colours used to render them throughout the UI.

export type DomainKey =
  | "Red"
  | "Green"
  | "Blue"
  | "Purple"
  | "Black"
  | "Yellow"
  | "Multicolor";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  color: string;
  color2: string;
  text: string;
}

// One Piece card colours.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  Red: { key: "Red", label: "Red", color: "#d3402f", color2: "#6e1a12", text: "#ffd9d4" },
  Green: { key: "Green", label: "Green", color: "#2f9e44", color2: "#14521f", text: "#d6f5dc" },
  Blue: { key: "Blue", label: "Blue", color: "#2978c4", color2: "#133a66", text: "#d8e6ff" },
  Purple: { key: "Purple", label: "Purple", color: "#8b5cf6", color2: "#3b2173", text: "#e9ddff" },
  Black: { key: "Black", label: "Black", color: "#4a4a55", color2: "#1c1c24", text: "#e4e4ec" },
  Yellow: { key: "Yellow", label: "Yellow", color: "#e6b800", color2: "#6e5500", text: "#fff3c4" },
  Multicolor: { key: "Multicolor", label: "Multicolor", color: "#c9a227", color2: "#6e5512", text: "#fbeec4" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// One Piece card categories.
export const CARD_TYPES = ["Leader", "Character", "Event", "Stage"] as const;
export type CardType = (typeof CARD_TYPES)[number];

import { POKEMON_SETS } from "./pokemon-sets";
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = POKEMON_SETS.map((s) => ({ code: s.code, name: s.name, slug: s.slug }));
export const setBySlug = (slug: string): SetInfo | undefined => SETS.find((s) => s.slug === slug);
export const setByCode = (code: string): SetInfo | undefined => SETS.find((s) => s.code === code);

export interface RarityInfo { key: string; label: string; color: string }

// One Piece rarities.
export const RARITIES: Record<string, RarityInfo> = {
  Common: { key: "Common", label: "Common", color: "#9aa0aa" },
  Uncommon: { key: "Uncommon", label: "Uncommon", color: "#30a46c" },
  Rare: { key: "Rare", label: "Rare", color: "#3b82f6" },
  "Super Rare": { key: "Super Rare", label: "Super Rare", color: "#a855f7" },
  "Secret Rare": { key: "Secret Rare", label: "Secret Rare", color: "#f5a524" },
  Leader: { key: "Leader", label: "Leader", color: "#e2592b" },
  "Special": { key: "Special", label: "Special / Alt-Art", color: "#ec4899" },
  "Manga Rare": { key: "Manga Rare", label: "Manga Rare", color: "#f472b6" },
  Promo: { key: "Promo", label: "Promo", color: "#14b8a6" },
};
export const RARITY_KEYS = Object.keys(RARITIES);

export interface ConditionInfo { key: string; label: string; full: string; color: string }
export const CONDITIONS: Record<string, ConditionInfo> = {
  NM: { key: "NM", label: "NM", full: "Near Mint", color: "#30a46c" },
  LP: { key: "LP", label: "LP", full: "Lightly Played", color: "#86b300" },
  MP: { key: "MP", label: "MP", full: "Moderately Played", color: "#f5a524" },
  HP: { key: "HP", label: "HP", full: "Heavily Played", color: "#f5793b" },
  DMG: { key: "DMG", label: "DMG", full: "Damaged", color: "#e5484d" },
};
export const CONDITION_KEYS = Object.keys(CONDITIONS);
export const CONDITION_MULTIPLIER: Record<string, number> = { NM: 1.0, LP: 0.85, MP: 0.7, HP: 0.55, DMG: 0.4 };

export function domainInfo(key: string): DomainInfo { return DOMAINS[(key as DomainKey)] ?? DOMAINS.Red; }
export function titleCase(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
export function rarityInfo(key: string): RarityInfo { return RARITIES[key] ?? { key, label: key, color: "#9aa0aa" }; }
export function isSignature(collectorNumber: string): boolean { return collectorNumber.includes("*"); }
export function isOvernumbered(collectorNumber: string): boolean {
  if (collectorNumber.includes("*")) return false;
  const m = collectorNumber.match(/^(\d+)[a-z]?\/(\d+)/i);
  return m ? parseInt(m[1], 10) > parseInt(m[2], 10) : false;
}
export function conditionInfo(key: string): ConditionInfo { return CONDITIONS[key] ?? CONDITIONS.NM; }
