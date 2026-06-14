import type { Metadata } from "next";
import { CollectionView } from "@/components/CollectionView";

export const metadata: Metadata = {
  title: "My Collection — track your Magic cards & portfolio value",
  description:
    "Track the Magic cards you own, see your collection's live market value across stores, and watch your set completion grow.",
  robots: { index: false }, // personal page — nothing useful to index
};

export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">My collection</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Every card you've added, valued live at the cheapest store price in your market.
          Use the + button on any card page to add copies — quantities and progress are
          saved in this browser.
        </p>
      </div>
      <CollectionView />
    </div>
  );
}
