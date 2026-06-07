// Shared domain knowledge for PhoneCompare: form factor (mapped onto the app's
// "domain" concept), OS ("types"), market tier ("rarities") and item
// conditions, plus the colours used across the UI.

export type DomainKey = "Compact" | "Standard" | "Max" | "Foldable" | "Flip";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  color: string;
  color2: string;
  text: string;
}

// Form factor / size class, coloured for the generated tile accents.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  Compact: { key: "Compact", label: "Compact", color: "#14b8a6", color2: "#0c4a44", text: "#cffaf3" },
  Standard: { key: "Standard", label: "Standard", color: "#6366f1", color2: "#2a2c77", text: "#e0e1ff" },
  Max: { key: "Max", label: "Max / Plus", color: "#a855f7", color2: "#3b1063", text: "#eddbff" },
  Foldable: { key: "Foldable", label: "Foldable", color: "#ec4899", color2: "#6b1535", text: "#ffd9ea" },
  Flip: { key: "Flip", label: "Flip", color: "#f59e0b", color2: "#5e3c08", text: "#ffeccd" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Operating system — the top-level platform.
export const CARD_TYPES = ["iOS", "Android"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Brands (mapped onto the app's "set" concept) --------------------------
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = [
  { code: "APPLE", name: "Apple", slug: "apple" },
  { code: "SAMSUNG", name: "Samsung", slug: "samsung" },
  { code: "GOOGLE", name: "Google", slug: "google" },
  { code: "MOTOROLA", name: "Motorola", slug: "motorola" },
  { code: "ONEPLUS", name: "OnePlus", slug: "oneplus" },
  { code: "XIAOMI", name: "Xiaomi", slug: "xiaomi" },
  { code: "OPPO", name: "OPPO", slug: "oppo" },
  { code: "NOTHING", name: "Nothing", slug: "nothing" },
  { code: "SONY", name: "Sony", slug: "sony" },
];
export const setBySlug = (slug: string): SetInfo | undefined => SETS.find((s) => s.slug === slug);
export const setByCode = (code: string): SetInfo | undefined => SETS.find((s) => s.code === code);

export interface RarityInfo {
  key: string;
  label: string;
  color: string;
}

// Market tiers (mapped onto "rarity").
export const RARITIES: Record<string, RarityInfo> = {
  Budget: { key: "Budget", label: "Budget", color: "#9aa0aa" },
  "Mid-range": { key: "Mid-range", label: "Mid-range", color: "#30a46c" },
  Flagship: { key: "Flagship", label: "Flagship", color: "#3b82f6" },
  Ultra: { key: "Ultra", label: "Ultra / Pro", color: "#a855f7" },
};

export const RARITY_KEYS = Object.keys(RARITIES);

export interface ConditionInfo {
  key: string;
  label: string;
  full: string;
  color: string;
}

// Device condition (keys kept stable for cross-app compatibility).
export const CONDITIONS: Record<string, ConditionInfo> = {
  NM: { key: "NM", label: "New", full: "Brand New", color: "#30a46c" },
  LP: { key: "LP", label: "Open Box", full: "Open Box", color: "#86b300" },
  MP: { key: "MP", label: "Refurb", full: "Refurbished", color: "#f5a524" },
  HP: { key: "HP", label: "Used", full: "Used", color: "#f5793b" },
  DMG: { key: "DMG", label: "Faulty", full: "Faulty / For parts", color: "#e5484d" },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);

export const CONDITION_MULTIPLIER: Record<string, number> = {
  NM: 1.0,
  LP: 0.92,
  MP: 0.8,
  HP: 0.65,
  DMG: 0.4,
};

export function domainInfo(key: string): DomainInfo {
  return DOMAINS[(key as DomainKey)] ?? DOMAINS.Standard;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function rarityInfo(key: string): RarityInfo {
  return RARITIES[key] ?? { key, label: key, color: "#9aa0aa" };
}

export function isSignature(collectorNumber: string): boolean {
  return collectorNumber.includes("*");
}

export function isOvernumbered(collectorNumber: string): boolean {
  if (collectorNumber.includes("*")) return false;
  const m = collectorNumber.match(/^(\d+)[a-z]?\/(\d+)/i);
  return m ? parseInt(m[1], 10) > parseInt(m[2], 10) : false;
}

export function conditionInfo(key: string): ConditionInfo {
  return CONDITIONS[key] ?? CONDITIONS.NM;
}
