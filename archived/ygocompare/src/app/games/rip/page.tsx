import type { Metadata } from "next";
import Link from "next/link";
import { PackRip } from "@/components/PackRip";
import { TcgplayerAd } from "@/components/TcgplayerAd";
import { getCountry } from "@/lib/get-country";

export const metadata: Metadata = {
  title: "Pack Rip Simulator — Open Yu-Gi-Oh! Packs for Free",
  description:
    "Rip simulated 10-card Yu-Gi-Oh! packs from recent sets, flip each card to reveal real market values, and see if your pack beats the typical pack price. Free, no signup.",
  alternates: { canonical: "/games/rip" },
};

// Static shell; the pack is dealt client-side via the API on demand.
export default function PackRipPage() {
  const country = getCountry();
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/games" className="text-sm text-slate-400 hover:text-slate-200">← All games</Link>
      <div className="mt-3">
        <PackRip />
      </div>
      <TcgplayerAd size="leaderboard" country={country} className="mt-8" />
    </div>
  );
}
