// Site identity. SITE_URL drives canonicals, sitemaps and JSON-LD — override via
// env per deploy. `||` (not `??`) so an empty env var still falls back.
export const SITE_NAME = "TCGPriceEmpire";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tcgpriceempire.com";
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "contact@tcgpriceempire.com";
