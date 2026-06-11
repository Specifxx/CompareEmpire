import type { Metadata } from "next";
import Link from "next/link";
import { CardCatcher } from "@/components/CardCatcher";

export const metadata: Metadata = {
  title: "Card Catcher — the Pokémon card arcade game",
  description:
    "Catch falling Pokémon cards and bank their real market value — dodge the fakes, ride the combo, grab gold ×2 and slow-mo power-ups. A free arcade game built on live card prices.",
  alternates: { canonical: "/games/catcher" },
};

export default function CatcherPage() {
  return (
    <div>
      <Link href="/games" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        ← All games
      </Link>
      <CardCatcher />
    </div>
  );
}
