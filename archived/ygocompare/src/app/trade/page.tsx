import type { Metadata } from "next";
import { TradeCalculator } from "@/components/TradeCalculator";

export const metadata: Metadata = {
  title: "Yu-Gi-Oh! Trade Calculator — Compare card trade values",
  description:
    "Trading Yu-Gi-Oh! cards in person? Add each side's cards and instantly compare their total value using YGOCompare's live lowest prices — so you know a trade is fair before you shake on it.",
  alternates: { canonical: "/trade" },
};

// Static shell; the calculator itself is client-side (reads the country cookie via
// the CountryProvider and fetches prices on demand).
export default function TradePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold text-white">Trade Calculator</h1>
        <p className="mt-1 text-slate-400">
          Trading cards with a friend or at a meet? Add each side&apos;s cards below to compare their total
          value at a glance — using YGOCompare&apos;s live lowest prices — and trade with confidence.
        </p>
      </header>
      <TradeCalculator />
    </div>
  );
}
