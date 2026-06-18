import type { Metadata } from "next";
import { Sora, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { GameProvider } from "@/components/GameProvider";
import { GamePicker } from "@/components/GamePicker";
import { CountryProvider } from "@/components/CountryProvider";
import { getSelectedGames, hasGamesCookie } from "@/lib/get-games";
import { getCountry } from "@/lib/get-country";
import { GAME_LIST } from "@/lib/games";
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from "@/lib/ads";
import { IMPACT_SITE_VERIFICATION } from "@/lib/affiliate";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const sora = Sora({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TCGPriceEmpire — Compare Prices Across Every Major TCG",
    template: "%s — TCGPriceEmpire",
  },
  description:
    "One price comparison for all five major trading card games — Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Riftbound. Compare TCGplayer, Cardmarket, eBay and more to find the cheapest copy of any card.",
  applicationName: SITE_NAME,
  keywords: [
    "TCG prices",
    "card prices",
    "Pokémon card prices",
    "MTG card prices",
    "Yu-Gi-Oh card prices",
    "One Piece card prices",
    "Riftbound card prices",
    "TCGplayer",
    "price comparison",
  ],
  icons: { apple: "/icon-512.png" },
  // NOTE: no site-wide canonical — each page declares its own so inner pages
  // never inherit "/" and look like duplicates of the homepage.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "TCGPriceEmpire — Compare Prices Across Every Major TCG",
    description:
      "Compare Pokémon, Magic, Yu-Gi-Oh!, One Piece and Riftbound card prices across TCGplayer, Cardmarket, eBay and more.",
  },
  twitter: { card: "summary_large_image" },
  verification: {
    // `||` so an env var accidentally set to an EMPTY string still falls back.
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: ["TCG Price Empire"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description:
        "Multi-TCG price comparison: Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece Card Game and Riftbound.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
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
  const games = getSelectedGames();
  const chosen = hasGamesCookie();
  const country = getCountry();
  return (
    <html lang="en" className={`${sora.variable} ${spaceGrotesk.variable}`}>
      <head>
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        {ADSENSE_ENABLED && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {/* Impact / TCGplayer affiliate site-ownership verification. Impact looks
            for the non-standard `value` attribute, so spread it past the typing. */}
        <meta {...({ name: "impact-site-verification", value: IMPACT_SITE_VERIFICATION } as any)} />
      </head>
      <body className="min-h-screen bg-ink-950">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <CountryProvider initial={country}>
          <GameProvider initial={games} initialChosen={chosen}>
            <Navbar />
            <main className="container-app py-6">{children}</main>
            <GamePicker />
          </GameProvider>
        </CountryProvider>
        <footer className="container-app border-t border-ink-800 py-8 text-center text-xs text-slate-500">
          <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/browse" className="hover:text-slate-300">Browse</Link>
            <Link href="/sealed" className="hover:text-slate-300">Sealed</Link>
            {GAME_LIST.map((g) => (
              <Link key={g.key} href={`/${g.slug}`} className="hover:text-slate-300">
                {g.short}
              </Link>
            ))}
            <Link href="/wishlist" className="hover:text-slate-300">Wishlist</Link>
            <Link href="/about" className="hover:text-slate-300">About</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>
          </nav>
          {/* Deep-coverage sister sites: store-by-store comparison per region. */}
          <p className="mb-2">
            Want store-by-store prices in Australia, NZ, the US &amp; the UK? Visit our specialist sites{" "}
            <a href="https://dexcompare.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-400 hover:underline">
              DexCompare
            </a>{" "}
            (Pokémon) and{" "}
            <a href="https://riftcompare.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-400 hover:underline">
              RiftCompare
            </a>{" "}
            (Riftbound).
          </p>
          <p>
            TCGPriceEmpire · price comparison for Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and
            Riftbound. Prices are sourced from public market data and may be out of date — always confirm on
            the vendor&apos;s site. Not affiliated with or endorsed by Nintendo, The Pokémon Company, Wizards
            of the Coast, Konami, Bandai or Riot Games. Some outbound links earn us a commission.
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
