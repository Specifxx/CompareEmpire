// Google AdSense, switched on by environment only: until NEXT_PUBLIC_ADSENSE_CLIENT is set (Vercel → Settings → Environment
// Variables, then redeploy), the site loads no Google script, /ads.txt is a 404 and the privacy page says no advertising cookies are
// set. DEPLOY.md, "Google AdSense", has the steps. Pure: safe in the browser (NEXT_PUBLIC_ values are inlined at build).
//
// What it turns on:
//   • the AdSense script and the google-adsense-account meta in every page's <head> (app/layout.tsx): what AdSense's site review
//     looks for, and what Auto ads (if the owner enables them in the AdSense dashboard) run from;
//   • /ads.txt (app/ads.txt/route.ts): Google's authorised-seller line for the publisher ID;
//   • with NEXT_PUBLIC_ADSENSE_SLOT_GUIDE too, one in-article unit in each guide (content/guides/kit.tsx), well clear of its eBay strip;
//   • the AdSense paragraphs on the privacy and about pages.

/** "ca-pub-1234567890123456", from NEXT_PUBLIC_ADSENSE_CLIENT ("pub-…" or "ca-pub-…" both accepted), or null when unset or malformed. */
export const ADSENSE_CLIENT: string | null = normaliseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

/** The ad unit ID of the guides' in-article unit (AdSense → Ads → By ad unit → In-article), or null: no unit. */
export const ADSENSE_GUIDE_SLOT: string | null = ADSENSE_CLIENT ? normaliseSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE) : null;

/** The adsbygoogle.js URL for the client. */
export const adsenseScriptSrc = (client: string) => `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;

/** The ads.txt body for the client: Google's line (its certification authority ID is fixed: f08c47fec0942fa0). */
export function adsTxt(client: string | null): string | null {
  return client ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n` : null;
}

export function normaliseClient(v: string | undefined): string | null {
  const m = /^(?:ca-)?pub-(\d{10,20})$/.exec(v?.trim() ?? "");
  return m ? `ca-pub-${m[1]}` : null;
}

function normaliseSlot(v: string | undefined): string | null {
  const s = v?.trim() ?? "";
  return /^\d{6,20}$/.test(s) ? s : null;
}
