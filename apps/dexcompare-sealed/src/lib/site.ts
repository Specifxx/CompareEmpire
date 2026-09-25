// Site-wide constants. SITE_URL is the canonical origin (no trailing slash);
// set NEXT_PUBLIC_SITE_URL in Vercel once the domain is attached.
export const SITE_NAME = "DexCompare";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://dexcompare.app").replace(/\/+$/, "");
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@dexcompare.app";
export const SITE_TAGLINE = "Pokémon sealed prices and stock, compared across independent stores.";
