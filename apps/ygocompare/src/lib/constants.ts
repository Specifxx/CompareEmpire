// Shared domain knowledge for the Yu-Gi-Oh! Trading Card Game: monster ATTRIBUTES
// (mapped onto the app's "domain" concept, plus Spell/Trap), card types, rarities
// and conditions, with the colours used to render them throughout the UI.

export type DomainKey =
  | "DARK" | "LIGHT" | "EARTH" | "WATER" | "FIRE" | "WIND" | "DIVINE" | "Spell" | "Trap";

export interface DomainInfo { key: DomainKey; label: string; color: string; color2: string; text: string }

export const DOMAINS: Record<DomainKey, DomainInfo> = {
  DARK: { key: "DARK", label: "DARK", color: "#7c3aed", color2: "#3b1d6b", text: "#e9ddff" },
  LIGHT: { key: "LIGHT", label: "LIGHT", color: "#e6b800", color2: "#6e5500", text: "#fff3c4" },
  EARTH: { key: "EARTH", label: "EARTH", color: "#92653a", color2: "#4a3220", text: "#f1e2d0" },
  WATER: { key: "WATER", label: "WATER", color: "#2978c4", color2: "#133a66", text: "#d8e6ff" },
  FIRE: { key: "FIRE", label: "FIRE", color: "#d3402f", color2: "#6e1a12", text: "#ffd9d4" },
  WIND: { key: "WIND", label: "WIND", color: "#2f9e44", color2: "#14521f", text: "#d6f5dc" },
  DIVINE: { key: "DIVINE", label: "DIVINE", color: "#f59e0b", color2: "#7a4e00", text: "#fff0cc" },
  Spell: { key: "Spell", label: "Spell", color: "#1ca3a3", color2: "#0c4a4a", text: "#d4f5f5" },
  Trap: { key: "Trap", label: "Trap", color: "#b5179e", color2: "#5a0b4f", text: "#ffd9f4" },
};
export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Yu-Gi-Oh! card types (frames) used as filters.
export const CARD_TYPES = [
  "Normal", "Effect", "Ritual", "Fusion", "Synchro", "Xyz", "Pendulum", "Link", "Spell", "Trap",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

import { POKEMON_SETS } from "./pokemon-sets";
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = POKEMON_SETS.map((s) => ({ code: s.code, name: s.name, slug: s.slug }));
export const setBySlug = (slug: string): SetInfo | undefined => SETS.find((s) => s.slug === slug);
export const setByCode = (code: string): SetInfo | undefined => SETS.find((s) => s.code === code);

export interface RarityInfo { key: string; label: string; color: string }
export const RARITIES: Record<string, RarityInfo> = {
  Common: { key: "Common", label: "Common", color: "#9aa0aa" },
  Rare: { key: "Rare", label: "Rare", color: "#3b82f6" },
  "Super Rare": { key: "Super Rare", label: "Super Rare", color: "#6366f1" },
  "Ultra Rare": { key: "Ultra Rare", label: "Ultra Rare", color: "#a855f7" },
  "Secret Rare": { key: "Secret Rare", label: "Secret Rare", color: "#f5a524" },
  "Ultimate Rare": { key: "Ultimate Rare", label: "Ultimate Rare", color: "#f97316" },
  "Ghost Rare": { key: "Ghost Rare", label: "Ghost Rare", color: "#c7d2fe" },
  "Starlight Rare": { key: "Starlight Rare", label: "Starlight Rare", color: "#fbbf24" },
  "Quarter Century Secret Rare": { key: "Quarter Century Secret Rare", label: "Quarter Century Secret", color: "#22d3ee" },
  "Prismatic Secret Rare": { key: "Prismatic Secret Rare", label: "Prismatic Secret", color: "#f472b6" },
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

export function domainInfo(key: string): DomainInfo { return DOMAINS[(key as DomainKey)] ?? DOMAINS.DARK; }
export function titleCase(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
export function rarityInfo(key: string): RarityInfo { return RARITIES[key] ?? { key, label: key, color: "#9aa0aa" }; }
export function isSignature(collectorNumber: string): boolean { return collectorNumber.includes("*"); }
export function isOvernumbered(collectorNumber: string): boolean {
  if (collectorNumber.includes("*")) return false;
  const m = collectorNumber.match(/^(\d+)[a-z]?\/(\d+)/i);
  return m ? parseInt(m[1], 10) > parseInt(m[2], 10) : false;
}
export function conditionInfo(key: string): ConditionInfo { return CONDITIONS[key] ?? CONDITIONS.NM; }
