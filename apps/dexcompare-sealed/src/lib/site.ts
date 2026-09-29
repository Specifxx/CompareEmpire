// Site-wide constants. SITE_URL is the canonical origin (no trailing slash):
// every canonical, hreflang, JSON-LD, robots and sitemap URL is built on it, so
// a wrong value here is a wrong value in every one of them. NEXT_PUBLIC_SITE_URL
// in Vercel overrides the default; DEPLOY.md, "Domains" says what to set.
export const SITE_NAME = "DexCompare";
export const SITE_URL = normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://www.dexcompare.app";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "riftcompare@gmail.com";
export const SITE_TAGLINE = "Pokémon sealed prices and stock, compared across independent stores.";

// Who runs the site, for the Terms and the footer. Set NEXT_PUBLIC_OPERATOR in
// Vercel to the trading name (a person or a company); until then the site name
// stands in. Nothing here invents a legal entity or an address.
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR?.trim() || SITE_NAME;

// Public profiles for Organization.sameAs (an X account, a Bluesky handle…).
// Empty until there are any: an empty list is left out of the JSON-LD.
export const SOCIAL_LINKS: string[] = [];

/** "https://www.dexcompare.app/" → "https://www.dexcompare.app"; garbage → null. */
function normaliseOrigin(v: string | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

// A production build whose canonical host is not the host it deploys to
// tells every crawler to index some other site. Say so in the build log, loudly,
// but never throw: a mis-set variable must not take the site down.
if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  const deployed = process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "").toLowerCase();
  const canonical = new URL(SITE_URL).host.toLowerCase();
  if (deployed !== canonical) {
    console.error(
      `\n[site] NEXT_PUBLIC_SITE_URL is ${SITE_URL} but this production deployment serves ${deployed}.\n` +
        `[site] Every canonical/hreflang/sitemap URL will point at ${canonical}. Fix NEXT_PUBLIC_SITE_URL in Vercel (DEPLOY.md, "Domains").\n`,
    );
  }
}
