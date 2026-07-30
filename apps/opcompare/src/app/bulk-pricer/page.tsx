import type { Metadata } from "next";
import { BulkPricerView } from "@/components/BulkPricerView";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bulk One Piece Card Pricer — Price Hundreds of Cards at Once | OPCompare",
  description:
    "Paste or upload a list of One Piece card names and get the cheapest live buy price and TCGplayer sell guide for every one — built for bulk and collection valuations, export to CSV.",
  alternates: { canonical: "/bulk-pricer" },
  openGraph: { title: "Bulk One Piece Card Pricer", url: `${SITE_URL}/bulk-pricer` },
};

export default function BulkPricerPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">📋 Bulk Pricer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Paste or upload a list of card names — one per line — and get the cheapest live buy price and TCGplayer
          sell guide for every card, valued as a total. Built for bulk lots and collection valuations.
        </p>
      </div>
      <BulkPricerView />
    </div>
  );
}
