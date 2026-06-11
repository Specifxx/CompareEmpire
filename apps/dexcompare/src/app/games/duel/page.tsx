import type { Metadata } from "next";
import Link from "next/link";
import { PriceDuel } from "@/components/PriceDuel";

export const metadata: Metadata = {
  title: "Price Duel — Higher or Lower Pokémon Card Game",
  description:
    "Is the mystery Pokémon card worth more or less? Guess higher or lower against real TCGplayer market values and see how long your streak lasts. Free, no signup.",
  alternates: { canonical: "/games/duel" },
};

// Static shell; the duel itself is client-side (the API derives every answer
// from a seed, so nothing here needs to be dynamic).
export default function PriceDuelPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/games" className="text-sm text-slate-400 hover:text-slate-200">← All games</Link>
      <div className="mt-3">
        <PriceDuel />
      </div>
    </div>
  );
}
