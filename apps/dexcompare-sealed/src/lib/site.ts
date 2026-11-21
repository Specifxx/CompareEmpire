// Site-wide constants. SITE_URL is the canonical origin (no trailing slash):
// every canonical, hreflang, JSON-LD, robots and sitemap URL is built on it, so
// a wrong value here is a wrong value in every one of them. NEXT_PUBLIC_SITE_URL
// in Vercel overrides the default; DEPLOY.md, "Domains" says what to set.
export const SITE_NAME = "DexCompare";
/** The canonical host: dexcompare.io since 2026-11-17 (owner: the one exception to "hosts never change", DECISIONS.md "Moving to
 * dexcompare.io"). dexcompare.app (apex since 2026-10-27, www before) only 301s here (next.config.js), path and query kept. */
export const CANONICAL_HOST = "dexcompare.io";
/** Every other host the site has answered on. Any of them in NEXT_PUBLIC_SITE_URL still means CANONICAL_HOST, and next.config.js
 * 301s each one to it. */
export const OLD_HOSTS = ["dexcompare.app", "www.dexcompare.app", "www.dexcompare.io"] as const;
export const SITE_URL = normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? `https://${CANONICAL_HOST}`;
// The mailbox the footer, contact, terms and privacy pages (and the scrapers' From header) give: the Compare Empire
// family inbox, compareempire@gmail.com, for every site without its own (owner, 2026-11-01: "the sites that they don't,
// just use compareempire@gmail.com"). NEXT_PUBLIC_CONTACT_EMAIL overrides it.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "compareempire@gmail.com";
export const CONTACT_EMAIL_SET: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
export const SITE_TAGLINE = "Pokémon sealed prices and stock, compared across independent stores.";

// Who runs the site, for the Terms and the footer. Set NEXT_PUBLIC_OPERATOR in
// Vercel to the trading name (a person or a company); until then the site name
// stands in. Nothing here invents a legal entity or an address.
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR?.trim() || SITE_NAME;

// The owner's other sites: lib/family-network.ts (FAMILY_SITES), shared by every Compare Empire site.

// Public profiles for Organization.sameAs (an X account, a Bluesky handle…).
// Empty until there are any: an empty list is left out of the JSON-LD.
export const SOCIAL_LINKS: string[] = [];
// This site's own never-expiring invite to the family's Discord hub "TCG Deals & Restocks" (lands in #pokemon-deals, the
// DexCompare deal feed), so the server's Invites list counts the members DexCompare brings (owner, 2026-11-20).
export const DISCORD_INVITE = "https://discord.gg/n6nc7EQH2D";

// The site's sections under /<region>, as the header's nav, the phone menu and the footer link to them: one list of paths,
// so the three never disagree. Labels differ by place ("Stores" in the nav, "Where to buy" in the menu) and live there.
export const SECTION_PATHS = {
  deals: "/deals",
  blackFriday: "/black-friday",
  cyberMonday: "/cyber-monday",
  boxingDay: "/boxing-day",
  januarySales: "/january-sales",
  lunarNewYear: "/lunar-new-year",
  thisWeek: "/this-week",
  backInStock: "/back-in-stock",
  priceMoves: "/price-moves",
  outOfPrint: "/out-of-print",
  sealed: "/sealed",
  boosterBoxes: "/type/booster-boxes",
  etbs: "/type/elite-trainer-boxes",
  bundles: "/type/booster-bundles",
  upcs: "/type/ultra-premium-collections",
  tins: "/type/tins",
  japanese: "/japanese",
  pokemon: "/pokemon",
  perPack: "/cheapest-packs",
  sets: "/sets",
  releases: "/releases",
  guides: "/guides",
  tools: "/tools",
  daily: "/daily",
  stores: "/stores",
} as const;
export type SectionKey = keyof typeof SECTION_PATHS;

/** "/au" + a section's path: `sectionHref("au", "deals")` → "/au/deals". */
export function sectionHref(region: string, key: SectionKey): string {
  return `/${region}${SECTION_PATHS[key]}`;
}

/**
 * The origin of NEXT_PUBLIC_SITE_URL, or null when it is not a URL. The site's own hosts (dexcompare.io, dexcompare.app, either www,
 * http or https) are always the canonical https://dexcompare.io, so a NEXT_PUBLIC_SITE_URL still set to an old host in Vercel can't
 * send crawlers there.
 */
export function normaliseOrigin(v: string | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    if (host === CANONICAL_HOST || (OLD_HOSTS as readonly string[]).includes(host)) return `https://${CANONICAL_HOST}`;
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

/**
 * The phone bottom nav (components/BottomNav.tsx, DECISIONS.md 2026-11-18): "optin" = only a visitor who opens any page with ?bn=1
 * sees it (kept in localStorage; ?bn=0 clears it); "on" = every phone visitor (?bn=0 still hides it for them); "off" = the rollback,
 * which ignores ?bn=1 too.
 */
export const BOTTOM_NAV: "off" | "optin" | "on" = "on";
