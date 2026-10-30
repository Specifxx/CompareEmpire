import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { QuickView } from "@/components/QuickView";
import { IMPACT_SITE_VERIFICATIONS } from "@/lib/affiliate";
import { ADSENSE_CLIENT, adsenseScriptSrc } from "@/lib/adsense";
import { GA4_ID, ga4BootScript, ga4ScriptSrc } from "@/lib/ga4";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { jsonLd, siteJsonLd } from "@/lib/seo";
import { SEASON_BOOT_SCRIPT } from "@/lib/season";
import { THEME_BOOT_SCRIPT, THEME_COLOR } from "@/lib/theme";
import "./globals.css";

// Font display is optional, not swap: both faces are preloaded, so a warm visit renders in them from the first paint, and a slow
// first visit keeps the size-adjusted fallback for that page instead of re-wrapping every line when the font lands (that swap
// measured CLS 0.209 on /us/type/booster-boxes; 0 with "optional").
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "optional" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "optional", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Pokémon sealed prices & stock`, template: `%s | ${SITE_NAME}` },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  // Large image previews and full snippets in Google (Search, Discover, Images), as RiftCompare does.
  // A page that sets its own `robots` (noindex) replaces this whole object.
  robots: { googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  // Dark by default (lib/theme.ts); the toggle rewrites it for a visitor who picks light.
  themeColor: THEME_COLOR.dark,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} guides`} href="/feed.xml" />
        {/* Seasonal theme (Halloween, 16–31 October): data-season on <html> from the visitor's own date, before first paint, so the
            CDN's one copy needs no cookie or header. lib/season.ts. */}
        <script dangerouslySetInnerHTML={{ __html: SEASON_BOOT_SCRIPT }} />
        {/* Theme: dark unless this browser saved "light" (lib/theme.ts), applied before first paint; no cookie, so one CDN copy. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Product photos: 96% are on Shopify's CDN, most of the rest on TCGplayer's.
            Warming those two connections is the cheapest LCP win there is. */}
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="dns-prefetch" href="https://tcgplayer-cdn.tcgplayer.com" />
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        {IMPACT_SITE_VERIFICATIONS.map((value) => (
          <meta key={value} {...({ name: "impact-site-verification", value } as React.MetaHTMLAttributes<HTMLMetaElement>)} />
        ))}
        {/* Google AdSense (lib/adsense.ts): the owner's publisher ID unless NEXT_PUBLIC_ADSENSE_CLIENT says otherwise ("off": none).
            The meta and the script are what AdSense's site review looks for; ads only show in the units the site places, or wherever
            Auto ads put them if enabled in AdSense. */}
        {ADSENSE_CLIENT && (
          <>
            <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
            <script async src={adsenseScriptSrc(ADSENSE_CLIENT)} crossOrigin="anonymous" />
          </>
        )}
        {/* Google Analytics 4 (lib/ga4.ts): only once NEXT_PUBLIC_GA4_ID is set; consent defaults first, for the amazon_click event. */}
        {GA4_ID && (
          <>
            <script dangerouslySetInnerHTML={{ __html: ga4BootScript(GA4_ID) }} />
            <script async src={ga4ScriptSrc(GA4_ID)} />
          </>
        )}
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        {/* Each layout under this one (and the 404 and error pages) draws the Header, its <main> and the Footer itself: the
            footer's links depend on the page's region. */}
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteJsonLd()) }} />
        <QuickView />
        <SiteAnalytics />
        {/* Vercel Speed Insights: real visitors' Core Web Vitals, per page (Speed Insights must be enabled on the project). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
