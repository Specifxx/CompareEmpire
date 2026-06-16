import type { Metadata } from "next";
import Link from "next/link";
import { Sora, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { QuickViewProvider } from "@/components/QuickView";
import { WishlistDrawerProvider } from "@/components/WishlistDrawer";
import { CountryProvider } from "@/components/CountryProvider";
import { getCountry } from "@/lib/get-country";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { IMPACT_SITE_VERIFICATION } from "@/lib/affiliate";

// Body: Sora (modern, energetic, readable). Headings: Space Grotesk (distinctive,
// gives the brand more life). Exposed as CSS vars wired into Tailwind.
const sora = Sora({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CameraCompare — Camera Database & Price Comparison",
    template: "%s — CameraCompare",
  },
  description:
    "The camera database and price comparison. Browse cameras and compare live prices across stores in Australia, the United States and the United Kingdom to find the cheapest place to buy.",
  applicationName: SITE_NAME,
  keywords: ["camera", "cameras", "camera prices", "mirrorless camera", "DSLR", "buy camera"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "CameraCompare — Camera Database & Price Comparison",
    description:
      "Compare live camera prices across stores in Australia, the US and the UK to find the cheapest place to buy.",
  },
  twitter: { card: "summary_large_image" },
  // Search engine site verification. Google's "HTML tag" method verifies a
  // URL-prefix property INSTANTLY (no DNS propagation wait) — the token below is
  // served in <head> on every page. Override per-deploy via env if needed.
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION ??
      "fPFxAkXOBeYdNPNbNGo-ZItApU0457uWVkbPkfzzzXs",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ["Camera Compare", "CameraCompare.com"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description:
        "Camera database and live price-comparison across Australia, the US and the UK.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["Camera Compare", "CameraCompare.com"],
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
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks for
            the non-standard `value` attribute, so spread it past the meta typing. */}
        <meta {...({ name: "impact-site-verification", value: IMPACT_SITE_VERIFICATION } as any)} />
      </head>
      <body className="min-h-screen bg-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <CountryProvider initial={country}>
        <WishlistDrawerProvider>
          <QuickViewProvider>
            <Navbar />
            <main className="container-app py-6">{children}</main>
          </QuickViewProvider>
        </WishlistDrawerProvider>
        </CountryProvider>
        <footer className="container-app border-t border-slate-200 py-8 text-center text-xs text-slate-500">
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
          <div className="mb-2 flex items-center justify-center gap-4 text-sm">
            <Link href="/contact" className="text-slate-700 hover:text-brand-400">Contact &amp; feedback</Link>
            <span className="text-slate-700">·</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>
          </div>
          <p>
            CameraCompare · camera database &amp; price comparison for
            Australia. Prices are sourced from public store listings and may be out
            of date — always confirm on the retailer&apos;s site. Not affiliated with
            or endorsed by Riot Games.
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
