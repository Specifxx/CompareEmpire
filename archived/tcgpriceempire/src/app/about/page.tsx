import type { Metadata } from "next";
import Link from "next/link";
import { GAME_LIST } from "@/lib/games";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About TCGPriceEmpire",
  description:
    "TCGPriceEmpire is a free, independent price comparison covering Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece and Riftbound.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">About TCGPriceEmpire</h1>
      <div className="card-surface mt-6 space-y-4 p-6 text-sm leading-relaxed text-slate-300">
        <p>
          TCGPriceEmpire is a free, independent price-comparison tool covering the five biggest trading
          card games. Whether you play one of them or all five, tell us which and the whole site —
          homepage, search, browse — tailors itself to your games.
        </p>
        <p>We currently cover:</p>
        <ul className="space-y-1.5">
          {GAME_LIST.map((g) => (
            <li key={g.key}>
              <Link href={`/${g.slug}`} className="font-semibold text-brand-400 hover:underline">
                {g.icon} {g.name}
              </Link>{" "}
              — {g.tagline.toLowerCase()}
            </li>
          ))}
        </ul>
        <p>
          Prices come from public market data — TCGplayer market prices for every game, Cardmarket (EU)
          for Magic and Yu-Gi-Oh!, plus eBay, Amazon and CoolStuffInc comparisons where available — and
          refresh daily. For store-by-store comparisons in Australia, New Zealand, the US and the UK, our
          specialist sister sites{" "}
          <a href="https://dexcompare.app" className="font-semibold text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">
            DexCompare
          </a>{" "}
          (Pokémon) and{" "}
          <a href="https://riftcompare.com" className="font-semibold text-brand-400 hover:underline" target="_blank" rel="noopener noreferrer">
            RiftCompare
          </a>{" "}
          (Riftbound) go deeper.
        </p>
        <p>
          Some outbound links earn us a commission at no cost to you — that&apos;s what keeps the site
          free. We are not affiliated with or endorsed by Nintendo, The Pokémon Company, Wizards of the
          Coast, Konami, Bandai or Riot Games.
        </p>
        <p>
          Spotted a wrong price, want a vendor added, or anything else? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}
