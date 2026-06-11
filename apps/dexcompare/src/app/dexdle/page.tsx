import type { Metadata } from "next";
import { Dexdle } from "@/components/Dexdle";

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
  return <Dexdle />;
}
