// Google Analytics 4: OFF until NEXT_PUBLIC_GA4_ID is set in Vercel (a measurement ID, G-XXXXXXXXXX), then loaded in every page's
// <head> (app/layout.tsx). It is there for the amazon_click event (components/AmazonLink.tsx: { product, region, page }, the owner's
// Amazon Associates round, 2026-10-26); Vercel Web Analytics stays the site's own page-view and buy-click count.
//
// CONSENT. Google Consent Mode v2: analytics and ad storage default to "denied" for visitors in the EEA, the UK and Switzerland, and the
// consent message the owner sets up in AdSense → Privacy & messaging (DEPLOY.md, "Google AdSense") grants or keeps it per visitor.
// Elsewhere it is granted by default. Read at BUILD time (NEXT_PUBLIC_*): redeploy after setting it. Pure: tests/amazon.test.ts.

/** A GA4 measurement ID, or null when unset or malformed (then nothing loads). */
export function ga4Id(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.NEXT_PUBLIC_GA4_ID?.trim().toUpperCase();
  return v && /^G-[A-Z0-9]{4,20}$/.test(v) ? v : null;
}

// Literal read: Next inlines NEXT_PUBLIC_* at build only for a literal property access.
export const GA4_ID = ga4Id({ NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID });

/** The EEA, the UK and Switzerland: where storage defaults to denied until the consent message says otherwise. */
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH",
];

/** The inline boot script: dataLayer, gtag, the consent defaults, then the config. The query string never leaves (site search terms). */
export function ga4BootScript(id: string): string {
  const denied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", region: CONSENT_REGIONS };
  return [
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;",
    `gtag('consent','default',${JSON.stringify(denied)});`,
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)},{page_location:location.origin+location.pathname});`,
  ].join("");
}

export const ga4ScriptSrc = (id: string) => `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
