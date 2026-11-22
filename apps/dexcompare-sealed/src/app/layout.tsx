import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { ShareArrival } from "@/components/ShareArrival";
import { PaidVisitTagger } from "@/components/PaidVisitTagger";
import { QuickView } from "@/components/QuickView";
import { ReturnNudge } from "@/components/ReturnNudge";
import { BottomNav } from "@/components/BottomNav";
import { RateCard } from "@/components/site-reviews/RateCard";
import { PremiumCorner } from "@/components/premium/PremiumCorner";
import { AdFreeSync } from "@/components/premium/AdFreeSync";
import { ADFREE_BOOT_SCRIPT } from "@/lib/premium-member";
import { IMPACT_SITE_VERIFICATIONS } from "@/lib/affiliate";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { GA4_ID, ga4BootScript, ga4ScriptSrc } from "@/lib/ga4";
import { BOTTOM_NAV, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { jsonLd, siteJsonLd } from "@/lib/seo";
import { CHRISTMAS_FESTIVE_LAYER, SEASON_BOOT_SCRIPT } from "@/lib/season";
import { THEME_BOOT_SCRIPT, THEME_COLOR } from "@/lib/theme";
import { REGION_BOOT_SCRIPT } from "@/lib/regions";
import "./globals.css";
// The cart list's styles (components/cart): imported here, never from a component, so node tests can load them.
import "@/components/cart/cart.css";
import "@/components/cart/cart-drawer.css";
import "@/components/store-vote.css";
import "@/components/vault/vault.css";
import "@/components/site-reviews/site-reviews.css";
import { ReturnBeacon } from "@/components/ReturnBeacon";
import { EbayPopArm } from "@/components/EbayPopArm";

// Font display is optional, not swap: both faces are preloaded, so a warm visit renders in them from the first paint, and a slow
// first visit keeps the size-adjusted fallback for that page instead of re-wrapping every line when the font lands (that swap
// measured CLS 0.209 on /us/type/booster-boxes; 0 with "optional").
// Self-hosted: the Google font loader fetched Google's CSS at build time and crashed the production build (RiftCompare 2026-11-05).
const sans = localFont({ src: "./fonts/inter-latin-wght.woff2", weight: "100 900", variable: "--font-sans", display: "optional" });
const display = localFont({ src: "./fonts/bricolage-grotesque-latin-wght.woff2", weight: "600 800", variable: "--font-display", display: "optional" });

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
    <html lang="en" className={`${sans.variable} ${display.variable}`} data-festive={CHRISTMAS_FESTIVE_LAYER ? "" : undefined} suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} guides`} href="/feed.xml" />
        {/* Seasonal theme (Halloween, 16–31 October): data-season on <html> from the visitor's own date, before first paint, so the
            CDN's one copy needs no cookie or header. lib/season.ts. */}
        <script dangerouslySetInnerHTML={{ __html: SEASON_BOOT_SCRIPT }} />
        {/* Theme: dark unless this browser saved "light" (lib/theme.ts), applied before first paint; no cookie, so one CDN copy. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* The visitor's own region (owner, 2026-11-01): a person, never a crawler, on another region's page goes to theirs. lib/region-boot.ts. */}
        <script dangerouslySetInnerHTML={{ __html: REGION_BOOT_SCRIPT }} />
        {/* Premium members: data-adfree on <html> before first paint hides the banner ads (lib/premium-member.ts). */}
        <script dangerouslySetInnerHTML={{ __html: ADFREE_BOOT_SCRIPT }} />
        {/* Product photos: 96% are on Shopify's CDN, most of the rest on TCGplayer's.
            Warming those two connections is the cheapest LCP win there is. TCGplayer's is a full preconnect since 2026-11-22: a
            TCGplayer photo was the measured LCP element on every page Lighthouse read (/us, a product page, /us/sealed, /us/hot-100,
            a type page), and a dns-prefetch left the TCP and TLS handshakes for after the page had drawn. */}
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="preconnect" href="https://tcgplayer-cdn.tcgplayer.com" />
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        {IMPACT_SITE_VERIFICATIONS.map((value) => (
          <meta key={value} {...({ name: "impact-site-verification", value } as React.MetaHTMLAttributes<HTMLMetaElement>)} />
        ))}
        {/* Google AdSense (lib/adsense.ts): only the account meta stays. The AdSense script is gone (owner, 2026-11-18: AdSense is
            off): it was about 250 kB of third-party JavaScript on every page, the largest weight before the first paint on a phone. */}
        {ADSENSE_CLIENT && <meta name="google-adsense-account" content={ADSENSE_CLIENT} />}
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
        <PremiumCorner />
        <AdFreeSync />
        {/* Rate us (owner, 2026-11-03): the corner card, asking only after real use; RiftCompare keeps the ratings. */}
        <RateCard />
        <ReturnNudge />
        {/* The phone bottom nav (owner, 2026-11-18): browser only, outside the quick view; BOTTOM_NAV in lib/site.ts is its switch. */}
        {BOTTOM_NAV !== "off" && <BottomNav mode={BOTTOM_NAV} />}
        <SiteAnalytics />
        <PaidVisitTagger />
        <ShareArrival />
        {/* Vercel Speed Insights: real visitors' Core Web Vitals, per page (Speed Insights must be enabled on the project). */}
        <SpeedInsights />
        <ReturnBeacon />
        {/* The eBay stand-out A/B (lib/ebay-pop.ts, 2026-11-19): sets <html data-ebaypop> in the browser. */}
        <EbayPopArm />
      </body>
    </html>
  );
}
