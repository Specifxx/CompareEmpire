// Shared domain knowledge for LaptopCompare: screen size (mapped onto the app's
// "domain" concept), OS ("types"), market tier ("rarities") and item
// conditions, plus the colours used across the UI.

export type DomainKey = "13-inch" | "14-inch" | "15-inch" | "16-inch" | "17-inch" | "2-in-1";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  color: string;
  color2: string;
  text: string;
}

// Screen-size class, coloured for the generated tile accents.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  "13-inch": { key: "13-inch", label: "13-inch", color: "#14b8a6", color2: "#0c4a44", text: "#cffaf3" },
  "14-inch": { key: "14-inch", label: "14-inch", color: "#0ea5e9", color2: "#0c4a6e", text: "#d8f0ff" },
  "15-inch": { key: "15-inch", label: "15-inch", color: "#6366f1", color2: "#2a2c77", text: "#e0e1ff" },
  "16-inch": { key: "16-inch", label: "16-inch", color: "#a855f7", color2: "#3b1063", text: "#eddbff" },
  "17-inch": { key: "17-inch", label: "17-inch", color: "#ef4444", color2: "#7a1616", text: "#ffdcdc" },
  "2-in-1": { key: "2-in-1", label: "2-in-1 / Convertible", color: "#f59e0b", color2: "#5e3c08", text: "#ffeccd" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Operating system — the top-level platform.
export const CARD_TYPES = ["macOS", "Windows", "ChromeOS"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Brands (mapped onto the app's "set" concept) --------------------------
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = [
  { code: "APPLE", name: "Apple", slug: "apple" },
  { code: "DELL", name: "Dell", slug: "dell" },
  { code: "HP", name: "HP", slug: "hp" },
  { code: "LENOVO", name: "Lenovo", slug: "lenovo" },
  { code: "ASUS", name: "Asus", slug: "asus" },
  { code: "ACER", name: "Acer", slug: "acer" },
  { code: "MSI", name: "MSI", slug: "msi" },
  { code: "MICROSOFT", name: "Microsoft", slug: "microsoft" },
  { code: "RAZER", name: "Razer", slug: "razer" },
  { code: "SAMSUNG", name: "Samsung", slug: "samsung" },
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
  Mainstream: { key: "Mainstream", label: "Mainstream", color: "#30a46c" },
  Premium: { key: "Premium", label: "Premium", color: "#3b82f6" },
  Gaming: { key: "Gaming", label: "Gaming", color: "#ef4444" },
  Workstation: { key: "Workstation", label: "Workstation", color: "#a855f7" },
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
  return DOMAINS[(key as DomainKey)] ?? DOMAINS["14-inch"];
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
