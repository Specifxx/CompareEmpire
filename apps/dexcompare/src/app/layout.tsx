import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { QuickViewProvider } from "@/components/QuickView";
import { WishlistDrawerProvider } from "@/components/WishlistDrawer";
import { CountryProvider } from "@/components/CountryProvider";
import { PriceAlertModal } from "@/components/PriceAlertModal";
import { getCountry } from "@/lib/get-country";
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from "@/lib/ads";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { IMPACT_SITE_VERIFICATION } from "@/lib/affiliate";

// Body: Sora (modern, energetic, readable). Headings: Space Grotesk (distinctive,
// gives the brand more life). Exposed as CSS vars wired into Tailwind.
const sora = Sora({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DexCompare — Pokémon Card Database & Price Comparison",
    template: "%s — DexCompare",
  },
  description:
    "The Pokémon TCG card database and price comparison. Browse every card and compare live prices across stores in Australia, New Zealand and the United States to find the cheapest place to buy.",
  applicationName: SITE_NAME,
  keywords: ["Pokémon", "Pokémon TCG", "Pokémon prices", "Pokémon singles", "card prices", "Pokémon card database"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "DexCompare — Pokémon Card Database & Price Comparison",
    description:
      "Compare live Pokémon TCG card prices across stores in Australia, New Zealand and the US to find the cheapest place to buy.",
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
      alternateName: ["Dex Compare", "DexCompare.app"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description:
        "Pokémon TCG card database and live price-comparison across Australia, New Zealand and the US.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const country = getCountry();
  return (
    <html lang="en-AU" className={`${sora.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* AdSense account/site verification — lets Google connect dexcompare.app
            to the AdSense account instantly. */}
        <meta name="google-adsense-account" content="ca-pub-6842128782879909" />
        {/* AdSense loader — Google's verbatim snippet, in the initial HTML head so
            site verification sees it without executing JS. Powers Auto ads + the
            manual <AdSlot /> units. Disabled when no publisher id is configured. */}
        {ADSENSE_ENABLED && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        <meta {...({ name: "impact-site-verification", value: IMPACT_SITE_VERIFICATION } as any)} />
        {/* Warm up the image CDN connection so card thumbnails start loading sooner. */}
        <link rel="preconnect" href="https://images.pokemontcg.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.pokemontcg.io" />
      </head>
      <body className="min-h-screen bg-ink-950">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <CountryProvider initial={country}>
        <WishlistDrawerProvider>
          <QuickViewProvider>
            <Navbar />
            <main className="container-app py-6">{children}</main>
          </QuickViewProvider>
        </WishlistDrawerProvider>
        <PriceAlertModal />
        </CountryProvider>
        <footer className="container-app border-t border-ink-800 py-8 text-center text-xs text-slate-500">
          <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/browse" className="hover:text-slate-300">Database</Link>
            <Link href="/guides" className="hover:text-slate-300">Buying guides</Link>
            <Link href="/blog" className="hover:text-slate-300">Blog</Link>
            <Link href="/trade" className="hover:text-slate-300">Trade calculator</Link>
            <Link href="/wishlist" className="hover:text-slate-300">Wishlist</Link>
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
