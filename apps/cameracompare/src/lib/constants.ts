// Shared domain knowledge for CameraCompare: sensor formats (mapped onto the
// app's "domain" concept), camera categories ("types"), market tiers
// ("rarities") and item conditions, plus the colours used across the UI.

export type DomainKey =
  | "Full Frame"
  | "APS-C"
  | "Micro 4/3"
  | "Medium Format"
  | "1-inch"
  | "Action";

export interface DomainInfo {
  key: DomainKey;
  label: string;
  color: string;
  color2: string;
  text: string;
}

// Sensor formats, coloured for the generated tile art.
export const DOMAINS: Record<DomainKey, DomainInfo> = {
  "Full Frame": { key: "Full Frame", label: "Full Frame", color: "#2563eb", color2: "#13235e", text: "#dbe6ff" },
  "APS-C": { key: "APS-C", label: "APS-C", color: "#14b8a6", color2: "#0c4a44", text: "#cffaf3" },
  "Micro 4/3": { key: "Micro 4/3", label: "Micro 4/3", color: "#8b5cf6", color2: "#3b1d77", text: "#ece0ff" },
  "Medium Format": { key: "Medium Format", label: "Medium Format", color: "#d4a017", color2: "#5e4708", text: "#fbeec4" },
  "1-inch": { key: "1-inch", label: "1-inch", color: "#64748b", color2: "#2b333f", text: "#eef1f5" },
  Action: { key: "Action", label: "Action / 360", color: "#f97316", color2: "#7a3408", text: "#ffe6cd" },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS) as DomainKey[];

// Camera categories — the top-level product types.
export const CARD_TYPES = ["Mirrorless", "DSLR", "Compact", "Action", "Lens", "Cinema"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---- Brands (mapped onto the app's "set" concept) --------------------------
export interface SetInfo { code: string; name: string; slug: string; comingSoon?: boolean }
export const SETS: SetInfo[] = [
  { code: "SONY", name: "Sony", slug: "sony" },
  { code: "CANON", name: "Canon", slug: "canon" },
  { code: "NIKON", name: "Nikon", slug: "nikon" },
  { code: "FUJI", name: "Fujifilm", slug: "fujifilm" },
  { code: "PANA", name: "Panasonic Lumix", slug: "panasonic" },
  { code: "OM", name: "OM System", slug: "om-system" },
  { code: "LEICA", name: "Leica", slug: "leica" },
  { code: "HASS", name: "Hasselblad", slug: "hasselblad" },
  { code: "GOPRO", name: "GoPro", slug: "gopro" },
  { code: "DJI", name: "DJI", slug: "dji" },
  { code: "SIGMA", name: "Sigma", slug: "sigma" },
  { code: "RICOH", name: "Ricoh", slug: "ricoh" },
  { code: "PENTAX", name: "Pentax", slug: "pentax" },
  { code: "PHASE", name: "Phase One", slug: "phase-one" },
  { code: "RED", name: "RED", slug: "red" },
  { code: "BMD", name: "Blackmagic", slug: "blackmagic" },
  { code: "ARRI", name: "ARRI", slug: "arri" },
  { code: "INSTA360", name: "Insta360", slug: "insta360" },
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
  Entry: { key: "Entry", label: "Entry", color: "#9aa0aa" },
  Enthusiast: { key: "Enthusiast", label: "Enthusiast", color: "#30a46c" },
  Professional: { key: "Professional", label: "Professional", color: "#3b82f6" },
  Flagship: { key: "Flagship", label: "Flagship", color: "#f5a524" },
};

export const RARITY_KEYS = Object.keys(RARITIES);

export interface ConditionInfo {
  key: string;
  label: string;
  full: string;
  color: string;
}

// Item condition grades (keys kept stable for cross-app compatibility).
export const CONDITIONS: Record<string, ConditionInfo> = {
  NM: { key: "NM", label: "New", full: "Brand New", color: "#30a46c" },
  LP: { key: "LP", label: "Open Box", full: "Open Box", color: "#86b300" },
  MP: { key: "MP", label: "Exc", full: "Excellent (Used)", color: "#f5a524" },
  HP: { key: "HP", label: "Good", full: "Good (Used)", color: "#f5793b" },
  DMG: { key: "DMG", label: "Fair", full: "Fair / Spares", color: "#e5484d" },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS);

export const CONDITION_MULTIPLIER: Record<string, number> = {
  NM: 1.0,
  LP: 0.92,
  MP: 0.8,
  HP: 0.65,
  DMG: 0.45,
};

export function domainInfo(key: string): DomainInfo {
  return DOMAINS[(key as DomainKey)] ?? { key, label: key || "Other", color: "#64748b", color2: "#2b333f", text: "#eef1f5" };
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
