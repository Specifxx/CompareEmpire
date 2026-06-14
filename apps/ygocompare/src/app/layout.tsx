import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SideNav } from "@/components/SideNav";
import { QuickViewProvider } from "@/components/QuickView";
import { WishlistDrawerProvider } from "@/components/WishlistDrawer";
import { CountryProvider } from "@/components/CountryProvider";
import { PriceAlertModal } from "@/components/PriceAlertModal";
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from "@/lib/ads";
import { SovrnSnippet } from "@/components/SovrnSnippet";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { EbayAd } from "@/components/EbayAd";
import { getCountry } from "@/lib/get-country";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { IMPACT_SITE_VERIFICATION } from "@/lib/affiliate";

// Body: Sora (modern, energetic, readable). Headings: Space Grotesk (distinctive,
// gives the brand more life). Exposed as CSS vars wired into Tailwind.
// display: "optional" — the single biggest CLS fix on the site. With "swap",
// the late font swap reflowed the ENTIRE page (Lighthouse measured a 1.0
// whole-body layout shift attributed to these two woff2 files). "optional"
// never swaps late: first paint uses the metric-matched fallback if the font
// isn't ready within ~100ms, and the brand font appears from cache on every
// visit after the first. Zero font CLS by construction.
const sora = Sora({ subsets: ["latin"], variable: "--font-sans", display: "optional" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "optional" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "YGOCompare — Yu-Gi-Oh! Card Database & Price Comparison",
    template: "%s — YGOCompare",
  },
  description:
    "The Yu-Gi-Oh! card database and price comparison. Browse cards and compare live prices across stores in Australia, New Zealand, the United States and the United Kingdom to find the cheapest place to buy Yu-Gi-Oh! singles.",
  applicationName: SITE_NAME,
  keywords: ["Yu-Gi-Oh! the Gathering", "Yu-Gi-Oh!", "Yu-Gi-Oh! prices", "Yu-Gi-Oh! singles", "card prices", "Yu-Gi-Oh! card database", "Yu-Gi-Oh! card prices"],
  // Apple devices don't read the generated icon.tsx — point them at the big PNG.
  // (The rel=icon link itself comes from src/app/icon.tsx, 96×96 for Google Search.)
  // NOTE: no site-wide canonical here — each page declares its own canonical so
  // inner pages never inherit "/" and look like duplicates of the homepage.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "YGOCompare — Yu-Gi-Oh! Card Database & Price Comparison",
    description:
      "Compare live Yu-Gi-Oh! card prices across stores in Australia, New Zealand, the US and the UK to find the cheapest place to buy.",
  },
  twitter: { card: "summary_large_image" },
  // Search engine site verification. Google's "HTML tag" method (URL-prefix
  // property) verifies instantly — this renders
  //   <meta name="google-site-verification" content="…" />
  // on every page. Override per-deploy via env if needed.
  verification: {
    // `||` (not `??`) so an env var accidentally set to an EMPTY string still
    // falls back to the real token — same trap as ADSENSE_CLIENT.
    google:
      process.env.GOOGLE_SITE_VERIFICATION ||
      "NAFWq3cLo4QA0hk4Xs8qkVkKItZsYDqTJnkY3UCXk8E",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ["Yu-Gi-Oh! Compare", "YGOCompare.app"],
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon`,
      description:
        "Yu-Gi-Oh! card database and live price-comparison across Australia, New Zealand, the US and the UK.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["Yu-Gi-Oh! Compare", "YGOCompare.app"],
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/browse?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const country = getCountry();
  return (
    <html lang="en-AU" className={`${sora.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* AdSense account/site verification — lets Google connect dexcompare.app
            to the AdSense account instantly. */}
        <meta name="google-adsense-account" content="ca-pub-6842128782879909" />
        {/* Official AdSense snippet, server-rendered in <head> so Google's
            application review reliably finds the code on every page (their
            checker reads the raw HTML — a deferred client-side injection is
            invisible to it). Async, so it doesn't block rendering. Once the
            application is APPROVED this can be swapped back to the deferred
            <AdSenseLoader/> if the PageSpeed points matter more. */}
        {ADSENSE_ENABLED && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        <meta {...({ name: "impact-site-verification", value: IMPACT_SITE_VERIFICATION } as any)} />
      </head>
      <body className="min-h-screen bg-ink-950">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <CountryProvider initial={country}>
        <WishlistDrawerProvider>
          <QuickViewProvider>
            <Navbar />
            <div className="container-app flex gap-6 py-6">
              <SideNav />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </QuickViewProvider>
        </WishlistDrawerProvider>
        <PriceAlertModal />
        </CountryProvider>
        <SovrnSnippet />
        {/* Site-wide affiliate banners above the footer — BOTH live partners
            (TCGplayer Impact + eBay Partner Network) on every page, so no page
            is left unmonetised. Both are CPC/affiliate: they pay on click-through
            purchases, so placement-where-relevant beats raw banner count. */}
        <div className="container-app flex flex-col items-center gap-3 pb-8">
          <TcgplayerAd size="leaderboard" country={country} />
          <EbayAd size="leaderboard" country={country} />
        </div>
        <footer className="container-app border-t border-ink-800 py-8 text-center text-xs text-slate-500">
          <NewsletterSignup siteName="YGOCompare" />
          <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/browse" className="hover:text-slate-300">Database</Link>
            <Link href="/sealed" className="hover:text-slate-300">Sealed products</Link>
            <Link href="/deals" className="hover:text-slate-300">Deals</Link>
            <Link href="/card-value" className="hover:text-slate-300">Card value checker</Link>
            <Link href="/restock" className="hover:text-slate-300">Drops &amp; restocks</Link>
            <Link href="/guides" className="hover:text-slate-300">Buying guides</Link>
            <Link href="/blog" className="hover:text-slate-300">Blog</Link>
            <Link href="/wishlist" className="hover:text-slate-300">Wishlist</Link>
            <Link href="/contact" className="hover:text-slate-300">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>
          </nav>
          {/* Cross-promotion: our sister site for the Pokémon TCG. */}
          <p className="mb-2">
            Also collect <strong className="font-semibold text-slate-400">Pokémon</strong> cards?
            Compare prices on our sister site{" "}
            <a
              href="https://dexcompare.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-400 hover:underline"
            >
              DexCompare.app
            </a>
            .
          </p>
          <p>
            YGOCompare · Yu-Gi-Oh! card database &amp; price comparison for
            Australia, New Zealand, the US and the UK. Prices are sourced from public
            store listings and may be out of date — always confirm on the retailer&apos;s
            site. Not affiliated with or endorsed by Konami.
            Yu-Gi-Oh! is a trademark of Konami.
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
