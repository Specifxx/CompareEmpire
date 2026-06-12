import type { Metadata } from "next";
import Link from "next/link";
import { BulkBreaker } from "@/components/BulkBreaker";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { getCountry } from "@/lib/get-country";

export const metadata: Metadata = {
  title: "Bulk Breaker — breakout with real Pokémon cards",
  description:
    "Breakout where the bricks are real Pokémon cards — smash them to bank their live market value, catch multi-ball and wide-paddle power-ups, and clear levels of fresh cards.",
  alternates: { canonical: "/games/breaker" },
};

export default function BreakerPage() {
  const country = getCountry();
  return (
    <div>
      <Link href="/games" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All games
      </Link>
      <BulkBreaker />
      <TcgplayerAd size="leaderboard" country={country} className="mt-8" />
    </div>
  );
}
