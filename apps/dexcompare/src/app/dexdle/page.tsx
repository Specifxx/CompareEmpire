import type { Metadata } from "next";
import { Dexdle } from "@/components/Dexdle";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { getCountry } from "@/lib/get-country";

export const metadata: Metadata = {
  title: "Dexdle — the daily Pokémon card guessing game",
  description:
    "Guess the Pokémon card in 8 tries. Free daily puzzle + unlimited mode — the blurred card art sharpens with every guess, with Wordle-style hints on set, energy type, rarity, HP and market value.",
  alternates: { canonical: "/dexdle" },
  openGraph: {
    type: "website",
    title: "Dexdle — the daily Pokémon card guessing game",
    description: "Guess the Pokémon card of the day in 8 tries — free, no signup.",
  },
};

export default function DexdlePage() {
  const country = getCountry();
  return (
    <div>
      <Dexdle />
      {/* TCGplayer banner under the puzzle — the game's daily repeat visitors
          are exactly the audience these creatives convert. */}
      <TcgplayerAd size="leaderboard" country={country} className="mt-8" />
    </div>
  );
}
