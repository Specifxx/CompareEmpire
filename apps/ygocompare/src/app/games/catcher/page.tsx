import type { Metadata } from "next";
import Link from "next/link";
import { CardCatcher } from "@/components/CardCatcher";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { getCountry } from "@/lib/get-country";

export const metadata: Metadata = {
  title: "Card Catcher — the Yu-Gi-Oh! card arcade game",
  description:
    "Catch falling Yu-Gi-Oh! cards and bank their real market value — dodge the fakes, ride the combo, grab gold ×2 and slow-mo power-ups. A free arcade game built on live card prices.",
  alternates: { canonical: "/games/catcher" },
};

export default function CatcherPage() {
  const country = getCountry();
  return (
    <div>
      <Link href="/games" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All games
      </Link>
      <CardCatcher />
      <TcgplayerAd size="leaderboard" country={country} className="mt-8" />
    </div>
  );
}
