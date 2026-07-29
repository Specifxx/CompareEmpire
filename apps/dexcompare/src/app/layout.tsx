import type { Metadata } from "next";
import { Suspense } from "react";
import { Sora, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AccountSync } from "@/components/AccountSync";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SideNav } from "@/components/SideNav";
import { QuickViewProvider } from "@/components/QuickView";
import { SealedQuickViewProvider } from "@/components/SealedQuickView";
import { WishlistDrawerProvider } from "@/components/WishlistDrawer";
import { CountryProvider } from "@/components/CountryProvider";
import { PriceAlertModal } from "@/components/PriceAlertModal";
import { MegaMenuProvider } from "@/components/MegaMenuProvider";
import { SovrnSnippet } from "@/components/SovrnSnippet";
import { NavProgress } from "@/components/NavProgress";
import { HilltopAdsLoader } from "@/components/HilltopAdsLoader";
import { FooterAds } from "@/components/FooterAds";
import { PathGate } from "@/components/PathGate";
import { DEFAULT_COUNTRY } from "@/lib/country";
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
// Monospace for prices / tabular figures — the "market terminal" numeral voice.
// `display: "optional"` keeps the zero-CLS guarantee (metric-matched fallback).
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "optional" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DexCompare — Pokémon Card Database & Price Comparison",
    template: "%s — DexCompare",
  },
  description:
    "The Pokémon TCG card database and price comparison. Browse every card and compare live prices across stores in Australia, New Zealand, the United States and the United Kingdom to find the cheapest place to buy.",
  applicationName: SITE_NAME,
  keywords: ["Pokémon", "Pokémon TCG", "Pokémon prices", "Pokémon singles", "card prices", "Pokémon card database"],
  // Apple devices don't read the generated icon.tsx — point them at the big PNG.
  // (The rel=icon link itself comes from src/app/icon.tsx, 96×96 for Google Search.)
  icons: { apple: "/icon-512.png" },
  // NOTE: no site-wide canonical here — each page declares its own canonical so
  // inner pages never inherit "/" and look like duplicates of the homepage.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "DexCompare — Pokémon Card Database & Price Comparison",
    description:
      "Compare live Pokémon TCG card prices across stores in Australia, New Zealand, the US and the UK to find the cheapest place to buy.",
  },
  twitter: { card: "summary_large_image" },
  // Opt into large image thumbnails + full text snippets in Google/Bing results
  // (Search-Essentials best practice). Per-page noindex still overrides this.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Search engine site verification. Google's "HTML tag" method (URL-prefix
  // property) verifies instantly — this renders
  //   <meta name="google-site-verification" content="…" />
  // on every page. Override per-deploy via env if needed.
  verification: {
    // `||` (not `??`) so an env var accidentally set to an EMPTY string still
    // falls back to the real token.
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
      alternateName: ["Dex Compare", "DexCompare.app"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description:
        "Pokémon TCG card database and live price-comparison across Australia, New Zealand, the US and the UK.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        availableLanguage: "English",
      },
      sameAs: ["https://riftcompare.com"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["Dex Compare", "DexCompare.app"],
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/browse?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

// CRITICAL FOR CACHING: this layout must never read cookies()/headers()
// (directly or via getCountry()/getCurrentUser()). A dynamic-API read in the
// root layout opts EVERY route into per-request rendering, silently disabling
// all the page-level `revalidate` exports across the site. Market and session
// are resolved client-side instead (CountryProvider reconciles from
// document.cookie + /api/geo; NavUser/AccountSync fetch /api/me).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Mark JS as available before first paint so the scroll-reveal CSS only
            hides content for users who can actually see the animation. Non-JS
            visitors and crawlers keep `html` class-less → everything stays
            visible (no FOUC, no hidden text). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        <meta {...({ name: "impact-site-verification", value: IMPACT_SITE_VERIFICATION } as any)} />
        {/* HilltopAds site-ownership verification (homepage). */}
        <meta name="d68c087f28c6dc4b343fac87f03a6358b9e3136e" content="d68c087f28c6dc4b343fac87f03a6358b9e3136e" />
        {/* Warm up the image CDN connection so card thumbnails start loading sooner. */}
        <link rel="preconnect" href="https://images.pokemontcg.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.pokemontcg.io" />
        {/* RSS auto-discovery on every page: feed readers, aggregators and
            auto-posting services find /feed.xml without guessing. Placed in the
            head JSX (not metadata.alternates) so page-level `alternates`
            canonicals can never shadow it. */}
        <link rel="alternate" type="application/rss+xml" title="DexCompare — Pokémon TCG Blog & Guides" href="/feed.xml" />
      </head>
      <body className="min-h-screen bg-ink-950">
        {/* Instant navigation feedback: starts on link click, completes on route
            change. Suspense because it reads useSearchParams. */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <CountryProvider initial={DEFAULT_COUNTRY}>
        <MegaMenuProvider>
        <WishlistDrawerProvider>
          <QuickViewProvider>
          <SealedQuickViewProvider>
            <Navbar />
            {/* Mounted once: merges a signed-in user's saved wishlist + collection
                with their anonymous local data, then keeps both synced cross-device. */}
            <AccountSync />
            <div className="container-app flex gap-6 py-6">
              <SideNav />
              <main id="main-content" className="min-w-0 flex-1">{children}</main>
            </div>
          </SealedQuickViewProvider>
          </QuickViewProvider>
        </WishlistDrawerProvider>
        <PriceAlertModal />
        {/* Site-wide affiliate banners above the footer — BOTH live partners
            (TCGplayer Impact + eBay Partner Network) on every page, so no page
            is left unmonetised. Both are CPC/affiliate: they pay on click-through
            purchases, so placement-where-relevant beats raw banner count.
            FooterAds reads the market from the client country context (inside
            CountryProvider) so the layout stays cookie-free and cacheable. */}
        <PathGate allow={["/", "/browse", "/card", "/sealed", "/deals", "/card-value", "/sets", "/restock"]}>
          <FooterAds />
        </PathGate>
        </MegaMenuProvider>
        </CountryProvider>
        <SovrnSnippet />
        {/* HilltopAds zone loader — the primary ad network, injected site-wide. */}
        <HilltopAdsLoader />
        <footer className="container-app border-t border-ink-800 py-8 text-center text-xs text-slate-500">
          <p className="mb-4">
            <a
              href="https://buymeacoffee.com/riftcompare"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFDD00] px-4 py-1.5 text-sm font-semibold text-[#0b0e14] transition hover:opacity-90"
            >
              ☕ Buy me a coffee
            </a>
          </p>
          <NewsletterSignup siteName="DexCompare" />
          <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/browse" className="hover:text-slate-300">Database</Link>
            <Link href="/sets" className="hover:text-slate-300">Browse by set</Link>
            <Link href="/sealed" className="hover:text-slate-300">Sealed products</Link>
            <Link href="/deals" className="hover:text-slate-300">Deals</Link>
            <Link href="/trending" className="hover:text-slate-300">Trending</Link>
            <Link href="/most-valuable" className="hover:text-slate-300">Most valuable</Link>
            <Link href="/card-value" className="hover:text-slate-300">Card value checker</Link>
            <Link href="/restock" className="hover:text-slate-300">Drops &amp; restocks</Link>
            <Link href="/guides" className="hover:text-slate-300">Buying guides</Link>
            <Link href="/stores" className="hover:text-slate-300">Stores we track</Link>
            <Link href="/widgets" className="hover:text-slate-300">Price widget</Link>
            <Link href="/tools/net-proceeds" className="hover:text-slate-300">Selling fees</Link>
            <Link href="/tools/grade-ev" className="hover:text-slate-300">Grade or not</Link>
            <Link href="/forum" className="hover:text-slate-300">Community board</Link>
            <Link href="/blog" className="hover:text-slate-300">Blog</Link>
            <Link href="/trade" className="hover:text-slate-300">Trade calculator</Link>
            <Link href="/wishlist" className="hover:text-slate-300">Wishlist</Link>
            <Link href="/about" className="hover:text-slate-300">About</Link>
            <Link href="/contact" className="hover:text-slate-300">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>
          </nav>
          {/* Cross-promotion: our sister site for the Riftbound TCG. */}
          <p className="mb-2">
            Also collect <strong className="font-semibold text-slate-400">Riftbound</strong> (the League of
            Legends TCG)? Compare card prices on our sister site{" "}
            <a
              href="https://riftcompare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-400 hover:underline"
            >
              RiftCompare.com
            </a>
            .
          </p>
          <p>
            DexCompare · Pokémon card database &amp; price comparison for Australia,
            New Zealand, the US and the UK. Prices are sourced from public store
            listings and may be out of date — always confirm on the retailer&apos;s
            site. Not affiliated with or endorsed by Nintendo, The Pokémon Company
            or Game Freak.
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
