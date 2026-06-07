// Shared domain knowledge for CarCompare: body types (mapped onto the app's
// "domain" concept), fuel types ("types"), market segments ("rarities") and
// item conditions, plus the colours used across the UI.

export type DomainKey =
  | "SUV"
  | "Sedan"
  | "Hatchback"
  | "Ute"
  | "Wagon"
  | "Coupe"
  | "Van"
  | "Convertible";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  color: string;
  color2: string;
  text: string;
}

// Body types, coloured for the generated tile accents.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  SUV: { key: "SUV", label: "SUV", color: "#2563eb", color2: "#13235e", text: "#dbe6ff" },
  Sedan: { key: "Sedan", label: "Sedan", color: "#0ea5e9", color2: "#0c4a6e", text: "#d8f0ff" },
  Hatchback: { key: "Hatchback", label: "Hatchback", color: "#14b8a6", color2: "#0c4a44", text: "#cffaf3" },
  Ute: { key: "Ute", label: "Ute / Pickup", color: "#f97316", color2: "#7a3408", text: "#ffe6cd" },
  Wagon: { key: "Wagon", label: "Wagon", color: "#8b5cf6", color2: "#3b1d77", text: "#ece0ff" },
  Coupe: { key: "Coupe", label: "Coupe", color: "#ef4444", color2: "#7a1616", text: "#ffdcdc" },
  Van: { key: "Van", label: "Van / People-mover", color: "#64748b", color2: "#2b333f", text: "#eef1f5" },
  Convertible: { key: "Convertible", label: "Convertible", color: "#eab308", color2: "#5e4708", text: "#fbeec4" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Fuel / drivetrain — the top-level powertrain types.
export const CARD_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "PHEV"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Makes (mapped onto the app's "set" concept) ---------------------------
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = [
  { code: "TOYOTA", name: "Toyota", slug: "toyota" },
  { code: "MAZDA", name: "Mazda", slug: "mazda" },
  { code: "HYUNDAI", name: "Hyundai", slug: "hyundai" },
  { code: "KIA", name: "Kia", slug: "kia" },
  { code: "FORD", name: "Ford", slug: "ford" },
  { code: "MITSUBISHI", name: "Mitsubishi", slug: "mitsubishi" },
  { code: "SUBARU", name: "Subaru", slug: "subaru" },
  { code: "VW", name: "Volkswagen", slug: "volkswagen" },
  { code: "HONDA", name: "Honda", slug: "honda" },
  { code: "NISSAN", name: "Nissan", slug: "nissan" },
  { code: "TESLA", name: "Tesla", slug: "tesla" },
  { code: "BMW", name: "BMW", slug: "bmw" },
  { code: "MERCEDES", name: "Mercedes-Benz", slug: "mercedes-benz" },
  { code: "AUDI", name: "Audi", slug: "audi" },
  { code: "LEXUS", name: "Lexus", slug: "lexus" },
  { code: "MG", name: "MG", slug: "mg" },
  { code: "ISUZU", name: "Isuzu", slug: "isuzu" },
  { code: "GWM", name: "GWM", slug: "gwm" },
];
export const setBySlug = (slug: string): SetInfo | undefined => SETS.find((s) => s.slug === slug);
export const setByCode = (code: string): SetInfo | undefined => SETS.find((s) => s.code === code);

export interface RarityInfo {
  key: string;
  label: string;
  color: string;
}

// Market segments (mapped onto "rarity").
export const RARITIES: Record<string, RarityInfo> = {
  Budget: { key: "Budget", label: "Budget", color: "#9aa0aa" },
  Mainstream: { key: "Mainstream", label: "Mainstream", color: "#30a46c" },
  Premium: { key: "Premium", label: "Premium", color: "#3b82f6" },
  Luxury: { key: "Luxury", label: "Luxury", color: "#a855f7" },
  Performance: { key: "Performance", label: "Performance", color: "#ef4444" },
};

export const RARITY_KEYS = Object.keys(RARITIES);

export interface ConditionInfo {
  key: string;
  label: string;
  full: string;
  color: string;
}

// Vehicle condition (keys kept stable for cross-app compatibility).
export const CONDITIONS: Record<string, ConditionInfo> = {
  NM: { key: "NM", label: "New", full: "Brand New", color: "#30a46c" },
  LP: { key: "LP", label: "Demo", full: "Demo / Ex-demo", color: "#86b300" },
  MP: { key: "MP", label: "Used", full: "Used", color: "#f5a524" },
  HP: { key: "HP", label: "High-km", full: "High kilometres", color: "#f5793b" },
  DMG: { key: "DMG", label: "Damaged", full: "Damaged / Repairable", color: "#e5484d" },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);

export const CONDITION_MULTIPLIER: Record<string, number> = {
  NM: 1.0,
  LP: 0.95,
  MP: 0.78,
  HP: 0.6,
  DMG: 0.4,
};

export function domainInfo(key: string): DomainInfo {
  return DOMAINS[(key as DomainKey)] ?? DOMAINS.SUV;
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
