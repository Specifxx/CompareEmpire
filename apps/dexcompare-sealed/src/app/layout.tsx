import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Footer } from "@/components/Footer";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { jsonLd } from "@/lib/seo";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Pokémon sealed prices & stock`, template: `%s | ${SITE_NAME}` },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#17181d" },
  ],
};

const orgLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.svg` },
    { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(orgLd) }} />
        <Analytics />
      </body>
    </html>
  );
}
