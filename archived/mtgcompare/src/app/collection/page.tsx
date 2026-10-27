import type { Metadata } from "next";
import { CollectionView } from "@/components/CollectionView";

export const metadata: Metadata = {
  title: "My Collection — track your Magic: The Gathering portfolio value & profit/loss",
  description:
    "Track the Magic: The Gathering cards you own, value your collection live across stores, see profit/loss against what you paid, chart your value over time, and import your collection by CSV.",
  robots: { index: false }, // personal page — nothing useful to index
};

export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">My collection</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Every card you&apos;ve added, valued live at the cheapest store price in your market. Enter what you
          paid to track profit/loss, watch your value over time, and import your collection by CSV. Use the +
          button on any card page to add copies — everything is saved in this browser.
        </p>
      </div>
      <CollectionView />
    </div>
  );
}
